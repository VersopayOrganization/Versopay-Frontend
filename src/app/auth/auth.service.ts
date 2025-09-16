import { Injectable, computed, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { environment } from '../../environment';
import { AuthUser } from '../models/auth/auth-user.dto';
import { LoginPayload } from '../models/auth/login-payload.dto';
import { AuthResponseDto } from '../models/auth/auth-response.dto';
import { firstValueFrom } from 'rxjs';
import { TipoCadastro } from '../core/enums/tipo-cadastro.enum';

const API_BASE = `${environment.apiUrl}/api/auth`;
type Persist = { user: AuthUser; token: string; exp: number };

// Tipos auxiliares
export type Login2FARequired = {
  requires2fa: true;
  challengeId: string;
  maskedEmail: string;
};

export type LoginSmartOk =
  | { status: 200; body: AuthResponseDto }
  | { status: 202; body: Login2FARequired };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private http = inject(HttpClient);

  private _user = signal<AuthUser | null>(null);
  user = computed(() => this._user());
  isLoggedIn = computed(() => !!this._user());

  constructor() { if (this.isBrowser) this.restore(); }

  private get local(): Storage | null { return this.isBrowser ? window.localStorage : null; }
  private get session(): Storage | null { return this.isBrowser ? window.sessionStorage : null; }

  private restore() {
    const raw = this.local?.getItem('vp_auth') ?? this.session?.getItem('vp_auth');
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as Persist;
      if (Date.now() < data.exp) this._user.set(data.user);
      else this.clear();
    } catch { this.clear(); }
  }

  private persist(resp: AuthResponseDto, remember: boolean) {
    const u: any = resp.usuario ?? {};

    const user: AuthUser = {
      id: String(u.id ?? ''),
      email: String(u.email ?? ''),
      chaveCarteiraCripto: u.chaveCarteiraCripto ?? '',
      chavePix: u.chavePix ?? '',
      cpfCnpj: u.cpfCnpj ?? '',
      cpfCnpjFormatado: u.cpfCnpjFormatado ?? '',
      createdAt: u.createdAt
        ? (typeof u.createdAt === 'string' ? u.createdAt : new Date(u.createdAt).toISOString())
        : '',
      isAdmin: !!u.isAdmin,
      instagram: u.instagram ?? u.instagram ?? '',
      nome: u.nome ?? '',
      nomeCompletoBanco: u.nomeCompletoBanco ?? '',
      nomeFantasia: u.nomeFantasia ?? '',
      razaoSocial: u.razaoSocial ?? '',
      site: u.site ?? '',
      telefone: u.telefone ?? '',
      tipoCadastro: (typeof u.tipoCadastro === 'number'
        ? u.tipoCadastro
        : Number(u.tipoCadastro)) as TipoCadastro,
      enderecoCep: u.enderecoCep ?? '',
      enderecoLogradouro: u.enderecoLogradouro ?? '',
      enderecoNumero: u.enderecoNumero ?? '',
      enderecoComplemento: u.enderecoComplemento ?? '',
      enderecoBairro: u.enderecoBairro ?? '',
      enderecoCidade: u.enderecoCidade ?? '',
      enderecoUF: u.enderecoUf ?? u.enderecoUF ?? '',
    };

    let expMs = Number.NaN;

    if (resp.expiresAtUtc) {
      const raw = String(resp.expiresAtUtc).trim();
      const iso = /Z$|[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}Z`;
      const parsed = Date.parse(iso);
      if (!Number.isNaN(parsed)) expMs = parsed;
    }

    if (Number.isNaN(expMs) && resp.accessToken) {
      try {
        const [, payloadB64] = resp.accessToken.split('.');
        const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(json);
        if (payload?.exp) expMs = payload.exp * 1000;
      } catch { }
    }

    if (Number.isNaN(expMs)) {
      expMs = Date.now() + 55 * 60 * 1000;
    }

    const persist: Persist = { user, token: resp.accessToken, exp: expMs };

    this._user.set(user);

    const raw = JSON.stringify(persist);
    const store = remember ? this.local : this.session;
    store?.setItem('vp_auth', raw);
  }


  private clear() {
    this._user.set(null);
    this.local?.removeItem('vp_auth');
    this.session?.removeItem('vp_auth');
  }

  // LOGIN INTELIGENTE: tenta usar bypass. Pode retornar 200 (tokens) OU 202 (requires2fa).
  async loginSmart(payload: LoginPayload): Promise<LoginSmartOk> {
    // NÃO passe AuthResponseDto aqui, use unknown para não “poluir” o tipo do body
    const res = await firstValueFrom(
      this.http.post<unknown>(`${API_BASE}/login`, payload, {
        withCredentials: true,
        observe: 'response',
      })
    );

    if (res.status === 200) {
      const body = res.body as AuthResponseDto;
      this.persist(body, !!payload.lembrar7Dias);
      return { status: 200, body };
    }

    if (res.status === 202) {
      // Normaliza a forma como o back pode retornar o challenge
      const raw: any = res.body;
      const b: Login2FARequired = raw?.challenge
        ? {
          requires2fa: true,
          challengeId: String(raw.challenge.challengeId),
          maskedEmail: String(raw.challenge.maskedEmail),
        }
        : {
          requires2fa: true,
          challengeId: String(raw.challengeId),
          maskedEmail: String(raw.maskedEmail),
        };

      return { status: 202, body: b };
    }
    throw new Error('Resposta inesperada do servidor.');
  }

  // força 2FA, ignorando bypass (se quiser usar em algum lugar)
  async start2fa(payload: LoginPayload) {
    const res = await firstValueFrom(
      this.http.post<unknown>(`${API_BASE}/login/2fa/start`, payload, {
        withCredentials: true,
        observe: 'response',
      })
    );

    if (res.status === 200) {
      const body = res.body as AuthResponseDto;
      this.persist(body, !!payload.lembrar7Dias);
      return { challengeId: null, maskedEmail: null, tokens: true };
    }

    const raw: any = res.body;
    const out: Login2FARequired = raw?.challenge
      ? {
        requires2fa: true,
        challengeId: String(raw.challenge.challengeId),
        maskedEmail: String(raw.challenge.maskedEmail),
      }
      : {
        requires2fa: true,
        challengeId: String(raw.challengeId),
        maskedEmail: String(raw.maskedEmail),
      };

    return out;
  }

  async confirm2fa(challengeId: string, code: string): Promise<boolean> {
    try {
      const normalized = (code ?? '').replace(/\D/g, '').slice(0, 6);

      const res = await firstValueFrom(
        this.http.post(`${API_BASE}/login/2fa/confirm`,
          { challengeId: String(challengeId), code: normalized },
          { withCredentials: true, observe: 'response' }
        )
      );

      return res.status >= 200 && res.status < 300;
    } catch (err: any) {
      const status = err?.status;
      const body = err?.error;
      console.error('confirm2fa ERROR', { status, body, challengeId, code });

      throw new Error(
        body?.message ?? body?.detail ?? `Falha no 2FA (status ${status ?? '??'})`
      );
    }
  }


  async loginFinal(payload: LoginPayload) {
    // segundo passo após 2FA: agora o /login deve retornar 200 com tokens (bypass cookie presente)
    const done = await this.loginSmart(payload);
    if (done.status !== 200) throw new Error('Falha ao concluir login.');
    return true;
  }

  async refresh(): Promise<boolean> {
    try {
      const resp = await firstValueFrom(
        this.http.post<AuthResponseDto>(`${API_BASE}/refresh`, {}, { withCredentials: true })
      );
      const hadLocal = !!this.local?.getItem('vp_auth');
      this.persist(resp, hadLocal);
      return true;
    } catch {
      this.clear();
      return false;
    }
  }

  logout() {
    this.http.post(`${API_BASE}/logout`, {}, { withCredentials: true }).subscribe({
      complete: () => {
        this.clear();
        if (this.isBrowser) location.assign('/auth/login');
      }
    });
  }

  get token(): string | null {
    if (!this.isBrowser) return null;
    const raw = this.local?.getItem('vp_auth') ?? this.session?.getItem('vp_auth');
    if (!raw) return null;

    try {
      const data = JSON.parse(raw) as Persist;
      if (!data?.token) return null;

      // só invalida se exp existir E estiver claramente vencido
      if (typeof data.exp === 'number' && !Number.isNaN(data.exp) && Date.now() >= data.exp) {
        return null;
      }
      return data.token;
    } catch {
      return null;
    }
  }

}
