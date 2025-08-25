import { Injectable, computed, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environment';

export type AuthUser = { id: string; email: string; name?: string; roles?: string[] };
type Persist = { user: AuthUser; token: string; exp: number };

export type LoginPayload = { email: string; senha: string; lembrar7Dias: boolean };
export type AuthResponseDto = {
  accessToken: string;
  expiresAtUtc: string; // ISO
  usuario: { id: number; nome: string; email: string; isAdmin: boolean };
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

  // ---------- API ----------
  async login(payload: LoginPayload): Promise<boolean> {
    const url = `${environment.apiUrl}/api/auth/login`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    try {
      const resp = await this.http
        .post<AuthResponseDto>(url, payload, { headers, withCredentials: true })
        .toPromise();

      if (!resp) return false;
      this.persist(resp, payload.lembrar7Dias);
      return true;
    } catch (err) {
      return false;
    }
  }

  async refresh(): Promise<boolean> {
    const url = `${environment.apiUrl}/api/auth/refresh`;
    try {
      const resp = await this.http
        .post<AuthResponseDto>(url, {}, { withCredentials: true })
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
    const url = `${environment.apiUrl}/api/auth/logout`;
    this.http.post(url, {}, { withCredentials: true }).subscribe({
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
