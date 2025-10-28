import { Injectable, computed, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment';
import { firstValueFrom } from 'rxjs';
import { AuthUser } from '../models/auth/auth-user.dto';
import { LoginPayload } from '../models/auth/login-payload.dto';
import { AuthResponseDto } from '../models/auth/auth-response.dto';
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

// Resposta do /login/2fa/confirm
export type Confirm2FAResponse = {
  auth: AuthResponseDto;
  perfil: any;
  dashboard: any;
  taxas: any;
};

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

  // Restaura sessão do storage
  private restore() {
    const raw = this.local?.getItem('vp_auth') ?? this.session?.getItem('vp_auth');
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as Persist;
      if (Date.now() < data.exp) this._user.set(data.user);
      else this.clear();
    } catch { this.clear(); }
  }

  // Persiste a partir do DTO "plano" (shape do /login e também de auth dentro do /confirm)
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
      instagram: u.instagram ?? '',
      nome: u.nome ?? '',
      nomeCompletoBanco: u.nomeCompletoBanco ?? '',
      nomeFantasia: u.nomeFantasia ?? '',
      razaoSocial: u.razaoSocial ?? '',
      site: u.site ?? '',
      telefone: u.telefone ?? '',
      // cuidado com null/undefined para não virar 0 indevidamente:
      tipoCadastro: (u.tipoCadastro ?? undefined) as TipoCadastro,
      enderecoCep: u.enderecoCep ?? '',
      enderecoLogradouro: u.enderecoLogradouro ?? '',
      enderecoNumero: u.enderecoNumero ?? '',
      enderecoComplemento: u.enderecoComplemento ?? '',
      cpfCnpjDadosBancarios: u.cpfCnpjDadosBancarios ?? '',
      enderecoBairro: u.enderecoBairro ?? '',
      enderecoCidade: u.enderecoCidade ?? '',
      enderecoUF: u.enderecoUf ?? u.enderecoUF ?? '',
      cadastroCompleto: !!u.cadastroCompleto
    };

    // Determina expiração (1) por expiresAtUtc; (2) por exp do JWT; (3) fallback 55min
    let expMs = Number.NaN;

    if (resp.expiresAtUtc) {
      const raw = String(resp.expiresAtUtc).trim();
      const iso = /Z$|[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}Z`;
      const parsed = Date.parse(iso);
      if (!Number.isNaN(parsed)) expMs = parsed;
    }

    if (Number.isNaN(expMs) && resp.accessToken && this.isBrowser) {
      try {
        const [, payloadB64] = resp.accessToken.split('.');
        const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(json);
        if (payload?.exp) expMs = payload.exp * 1000;
      } catch {
        // ignora - usaremos fallback
      }
    }

    if (Number.isNaN(expMs)) {
      expMs = Date.now() + 55 * 60 * 1000; // fallback 55min
    }

    const persist: Persist = { user, token: resp.accessToken, exp: expMs };

    this._user.set(user);

    const raw = JSON.stringify(persist);
    const store = remember ? this.local : this.session;
    store?.setItem('vp_auth', raw);
  }

  private persistFromLogin(body: AuthResponseDto, remember: boolean) {
    // /login retorna outcome.Auth (AuthResponseDto "plano")
    this.persist(body, remember);
  }

  private persistFromConfirm(body: Confirm2FAResponse, remember: boolean) {
    // 1) Usa "auth" (token + usuario + exp) para persistir sessão
    this.persist(body.auth, remember);

    // 2) (Opcional) também salva perfil/dashboard/taxas junto ao mesmo registro
    try {
      const store = (this.local?.getItem('vp_auth') ? this.local : this.session);
      const raw = store?.getItem('vp_auth');
      if (raw) {
        const parsed = JSON.parse(raw) as Persist & { perfil?: any; dashboard?: any; taxas?: any };
        parsed.perfil = body.perfil;
        parsed.dashboard = body.dashboard;
        parsed.taxas = body.taxas;
        store?.setItem('vp_auth', JSON.stringify(parsed));
      }
    } catch {
      // ignore
    }
  }

  private clear() {
    this._user.set(null);
    this.local?.removeItem('vp_auth');
    this.session?.removeItem('vp_auth');
  }

  // LOGIN inteligente: tenta com bypass e pode retornar 200 (tokens) OU 202 (requires2fa)
  async loginSmart(payload: LoginPayload): Promise<LoginSmartOk> {
    const res = await firstValueFrom(
      this.http.post<unknown>(`${API_BASE}/login`, payload, {
        withCredentials: true,
        observe: 'response'
      })
    );

    if (res.status === 200) {
      const body = res.body as AuthResponseDto;
      this.persistFromLogin(body, !!payload.lembrar7Dias);
      return { status: 200, body };
    }

    if (res.status === 202) {
      const raw: any = res.body;
      const b: Login2FARequired = raw?.challenge
        ? {
          requires2fa: true,
          challengeId: String(raw.challenge.challengeId),
          maskedEmail: String(raw.challenge.maskedEmail)
        }
        : {
          requires2fa: true,
          challengeId: String(raw.challengeId),
          maskedEmail: String(raw.maskedEmail)
        };
      return { status: 202, body: b };
    }

    throw new Error('Resposta inesperada do servidor.');
  }

  // Força 2FA (ignora bypass). Útil se quiser um botão "Entrar com 2FA" explícito.
  async start2fa(payload: LoginPayload) {
    const res = await firstValueFrom(
      this.http.post<unknown>(`${API_BASE}/login/2fa/start`, payload, {
        withCredentials: true,
        observe: 'response'
      })
    );

    if (res.status === 200) {
      const body = res.body as AuthResponseDto;
      this.persistFromLogin(body, !!payload.lembrar7Dias);
      return { challengeId: null, maskedEmail: null, tokens: true };
    }

    const raw: any = res.body;
    const out: Login2FARequired = raw?.challenge
      ? {
        requires2fa: true,
        challengeId: String(raw.challenge.challengeId),
        maskedEmail: String(raw.challenge.maskedEmail)
      }
      : {
        requires2fa: true,
        challengeId: String(raw.challengeId),
        maskedEmail: String(raw.maskedEmail)
      };

    return out;
  }

  // CONFIRMA 2FA e já persiste (não precisa chamar /login novamente)
  async confirm2fa(challengeId: string, code: string, remember?: boolean): Promise<Confirm2FAResponse> {
    try {
      const normalized = (code ?? '').replace(/\D/g, '').slice(0, 6);

      const res = await firstValueFrom(
        this.http.post<Confirm2FAResponse>(
          `${API_BASE}/login/2fa/confirm`,
          { challengeId: String(challengeId), code: normalized },
          { withCredentials: true, observe: 'response' }
        )
      );

      if (res.status !== 200 || !res.body) {
        throw new Error('Falha ao confirmar 2FA.');
      }

      // Persistência direta a partir da resposta do confirm
      this.persistFromConfirm(res.body, !!remember);
      return res.body;
    } catch (err: any) {
      const status = err?.status;
      const body = err?.error;
      console.error('confirm2fa ERROR', { status, body, challengeId, code });
      throw new Error(body?.message ?? body?.detail ?? `Falha no 2FA (status ${status ?? '??'})`);
    }
  }

  // Refresh silencioso (usa cookie HttpOnly)
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

  // Lê o token do storage (para Authorization: Bearer em chamadas da API)
  get token(): string | null {
    if (!this.isBrowser) return null;
    const raw = this.local?.getItem('vp_auth') ?? this.session?.getItem('vp_auth');
    if (!raw) return null;

    try {
      const data = JSON.parse(raw) as Persist;
      if (!data?.token) return null;

      // invalida só se exp existir e estiver vencido
      if (typeof data.exp === 'number' && !Number.isNaN(data.exp) && Date.now() >= data.exp) {
        return null;
      }
      return data.token;
    } catch {
      return null;
    }
  }
}
