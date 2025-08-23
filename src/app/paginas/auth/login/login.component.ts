import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginPayload } from '../../../auth/auth.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  standalone: true,
  selector: 'vp-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  email = '';
  senha = '';
  remember = false;
  backgroundImage = `url('assets/images/fundo-login.png')`;
  loading = false;

  constructor(private authService: AuthService, private router: Router, private toast: ToastService) { }

  async submit() {
    if (!this.email || !this.senha) {
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
        senha: this.senha,
        lembrar7Dias: this.remember,
      };

      const ok = await this.authService.login(payload);
      if (ok) this.router.navigateByUrl('/dashboard');
      else
        this.toast.show({
          message: 'E-mail ou senha inválidos.',
          type: 'error',
          position: 'bottom-left',
          offset: { x: 40, y: 40 }
        });

    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Falha ao autenticar', 'bottom-left');
    } finally {
      this.loading = false;
    }
  }
}
