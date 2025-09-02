import { Injectable, computed, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environment';
import { AuthUser } from '../models/auth/auth-user.dto';
import { LoginPayload } from '../models/auth/login-payload.dto';
import { AuthResponseDto } from '../models/auth/auth-response.dto';
import { DeviceTrustChallengeDto } from '../models/auth/device-trust.dtos';

const API_BASE = `${environment.apiUrl}/api/auth`;

type Persist = { user: AuthUser; token: string; exp: number };

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
    const exp = new Date(resp.expiresAtUtc).getTime();
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

  /** PASSO 1: inicia 2FA (gera challenge e envia código por e-mail) */
  start2fa(payload: LoginPayload) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<DeviceTrustChallengeDto>(
      `${API_BASE}/login/2fa/start`,
      payload,
      { headers, withCredentials: true }
    ).toPromise();
  }

  /** PASSO 2: confirma o código (204 NoContent = OK, cookie de bypass setado) */
  confirm2fa(challengeId: string, code: string) {
    const body = { challengeId, code };
    return this.http.post(
      `${API_BASE}/login/2fa/confirm`,
      body,
      { withCredentials: true, observe: 'response' }
    ).toPromise(); // status 204 esperado
  }

  /** PASSO 3: login final para receber o access token e persistir */
  async login(payload: LoginPayload): Promise<AuthResponseDto | null> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    try {
      const resp = await this.http
        .post<AuthResponseDto>(`${API_BASE}/login`, payload, { headers, withCredentials: true })
        .toPromise();

      if (!resp) return null;
      this.persist(resp, payload.lembrar7Dias);
      return resp;
    } catch {
      return null;
    }
  }

  async refresh(): Promise<boolean> {
    try {
      const resp = await this.http
        .post<AuthResponseDto>(`${environment.apiUrl}/api/auth/refresh`, {}, { withCredentials: true })
        .toPromise();
      if (!resp) return false;

      const hadLocal = !!this.local?.getItem('vp_auth');
      this.persist(resp, hadLocal);
      return true;
    } catch {
      this.clear();
      return false;
    }
  }

  logout() {
    this.http.post(`${environment.apiUrl}/api/auth/logout`, {}, { withCredentials: true }).subscribe({
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
