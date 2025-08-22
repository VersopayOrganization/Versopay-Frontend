import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginPayload } from '../../auth/auth.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  standalone: true,
  selector: 'vp-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  email = '';
  password = '';
  remember = false;
  backgroundImage = `url('assets/images/fundo-login.png')`;
  loading = false;
  toastMsg: string | null = null;

  constructor(private auth: AuthService, private router: Router, private toast: ToastService) { }

  async submit() {
    if (!this.email || !this.password) {
      this.toast.show({
        message: 'Todos os campos são obrigatórios.',
        type: 'error',
        position: 'bottom-left',
        offset: { x: 40, y: 40 }
      });
      return;
    }

    this.loading = true;
    try {
      const payload: LoginPayload = {
        email: this.email,
        senha: this.password,
        lembrar7Dias: this.remember,
      };

      const ok = await this.auth.login(payload);
      if (ok) this.router.navigateByUrl('/dashboard');
      else this.toast.error('E-mail ou senha inválidos.', 'bottom-left');

    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Falha ao autenticar', 'bottom-left');
    } finally {
      this.loading = false;
    }
  }
}
