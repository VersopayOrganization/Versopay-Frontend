import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  standalone: true,
  selector: 'vp-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  email = signal('');
  password = signal('');
  remember = signal(true);
  loading = signal(false);
  error = signal<string | null>(null);
  logo='assets/icons/logo-verso.svg';

  year = new Date().getFullYear();

  constructor(private auth: AuthService, private router: Router) {}

  async submit() {
    if (!this.email() || !this.password()) {
      this.error.set('Informe e-mail e senha.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      this.auth.login({ email: this.email() }, this.remember());
      this.router.navigateByUrl('/dashboard');
    } catch (e: any) {
      this.error.set(e?.message ?? 'Falha ao autenticar');
    } finally {
      this.loading.set(false);
    }
  }
}
