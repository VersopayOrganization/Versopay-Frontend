import { Injectable, computed, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AuthUser = { id: string; email: string; name?: string; roles?: string[] };
type Persist = { user: AuthUser; token: string; exp: number };

const DAYS_7 = 7 * 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private _user = signal<AuthUser | null>(null);
  user = computed(() => this._user());
  isLoggedIn = computed(() => !!this._user());

  constructor() {
    if (this.isBrowser) this.restore();
  }

  private get local(): Storage | null {
    return this.isBrowser ? window.localStorage : null;
  }
  private get session(): Storage | null {
    return this.isBrowser ? window.sessionStorage : null;
  }

  private restore() {
    const raw = this.local?.getItem('vp_auth') ?? this.session?.getItem('vp_auth');
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as Persist;
      if (Date.now() < data.exp) this._user.set(data.user);
      else this.clear();
    } catch { this.clear(); }
  }

  login(input: { email: string; name?: string }, remember = true) {
    const user: AuthUser = { id: crypto.randomUUID(), email: input.email, name: input.name ?? 'Usuário' };
    const persist: Persist = { user, token: 'mock-token', exp: Date.now() + (remember ? DAYS_7 : 2 * 60 * 60 * 1000) };
    this._user.set(user);
    const raw = JSON.stringify(persist);
    const store = remember ? this.local : this.session;
    store?.setItem('vp_auth', raw);
  }

  logout() {
    this.clear();
    if (this.isBrowser) location.assign('/auth/login');
  }

  private clear() {
    this._user.set(null);
    this.local?.removeItem('vp_auth');
    this.session?.removeItem('vp_auth');
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