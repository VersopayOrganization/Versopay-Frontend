import { Injectable, computed, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { environment } from '../../environment';
import { AuthUser } from '../models/auth/auth-user.dto';
import { LoginPayload } from '../models/auth/login-payload.dto';
import { AuthResponseDto } from '../models/auth/auth-response.dto';
import { firstValueFrom } from 'rxjs';

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
    const user: AuthUser = {
      id: String(resp.usuario.id),
      email: resp.usuario.email,
      name: resp.usuario.nome
    };
    const exp = new Date(resp.expiresAtUtc).getTime(); // vem em UTC
    const persist: Persist = { user, token: resp.accessToken, exp };
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

  async confirm2fa(challengeId: string, code: string): Promise<HttpResponse<any>> {
    return await firstValueFrom(
      this.http.post(`${API_BASE}/login/2fa/confirm`, { challengeId, code }, { withCredentials: true, observe: 'response' })
    );
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
      return Date.now() < data.exp ? data.token : null;
    } catch { return null; }
  }
}
