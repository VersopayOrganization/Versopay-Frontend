import { Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { Utils } from '../../../shared/utils.service';

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
  step: 'login' | 'code' = 'login';
  challengeId: string | null = null;
  maskedEmail = '';

  @ViewChildren('otpBox') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;
  otp: string[] = Array(6).fill('');
  get code(): string { return this.otp.join(''); }

  constructor(
    private authService: AuthService,
    private router: Router,
    private toast: ToastService,
    private utils: Utils
  ) { }

  navegarPagina(rota: string) {
    this.utils.navegarPagina(rota);
  }

  onOtpFocus(i: number) {
    const el = this.otpInputs.get(i)?.nativeElement;
    el?.select();
  }

  onOtpKeydown(i: number, ev: KeyboardEvent) {
    const el = this.otpInputs.get(i)?.nativeElement;
    if (!el) return;

    if (ev.ctrlKey || ev.metaKey) return;

    if (ev.key === 'Backspace') {
      setTimeout(() => {
        if (el.value === '' && i > 0) {
          this.otp[i - 1] = '';
          const prev = this.otpInputs.get(i)!.nativeElement;
          prev.focus(); prev.select();
        } else {
          this.otp[i] = '';
        }
      }, 0);
      return;
    }

    if (ev.key === 'ArrowLeft' && i > 0) {
      ev.preventDefault();
      const prev = this.otpInputs.get(i - 1)!.nativeElement;
      prev.focus(); prev.select();
      return;
    }
    if (ev.key === 'ArrowRight' && i < this.otp.length - 1) {
      ev.preventDefault();
      const next = this.otpInputs.get(i)!.nativeElement;
      next.focus(); next.select();
      return;
    }

    if (/^\d$/.test(ev.key)) {
      ev.preventDefault();
      this.otp[i] = ev.key;

      if (i < this.otp.length - 1) {
        const next = this.otpInputs.get(i)!.nativeElement;
        next.focus();
        next.select();
      }
      return;
    }

    if (ev.key.length === 1) ev.preventDefault();
  }

  onOtpInput(i: number, ev: Event) {
    const el = ev.target as HTMLInputElement;
    let digits = (el.value || '').replace(/\D/g, '');
    if (digits.length <= 1) {
      if (digits.length === 0) this.otp[i] = '';
      return;
    }

    let idx = i;
    for (const ch of digits) {
      if (idx >= this.otp.length) break;
      this.otp[idx] = ch;
      const box = this.otpInputs.get(idx)?.nativeElement;
      if (box) box.value = ch;
      idx++;
    }
    const focusIdx = Math.min(i + digits.length, this.otp.length - 1);
    const next = this.otpInputs.get(focusIdx)?.nativeElement;
    next?.focus(); next?.select();
  }

  onOtpPaste(i: number, ev: ClipboardEvent) {
    ev.preventDefault();
    const digits = (ev.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
    if (!digits) return;

    let idx = i;
    for (const ch of digits.slice(0, this.otp.length - i)) {
      this.otp[idx] = ch;
      const box = this.otpInputs.get(idx)?.nativeElement;
      if (box) box.value = ch;
      idx++;
    }
    const last = this.otpInputs.get(Math.min(idx, this.otp.length) - 1)?.nativeElement;
    last?.focus(); last?.select();
  }

  async submit() {
    if (!this.email || !this.senha) {
      this.toast.error('Todos os campos são obrigatórios.');
      return;
    }

    this.loading = true;
    try {
      const res = await this.authService.loginSmart({
        email: this.email,
        senha: this.senha,
        lembrar7Dias: this.remember,
      });

      if (res.status === 200) {
        // já logado (bypass válido)
        this.router.navigateByUrl('/dashboard');
        return;
      }

      // 202 → precisa de 2FA
      this.challengeId = res.body.challengeId;
      this.maskedEmail = res.body.maskedEmail;
      this.step = 'code';
      setTimeout(() => this.otpInputs?.first?.nativeElement.focus(), 0);

      this.toast.show({
        message: 'Enviamos um código para seu e-mail.',
        type: 'success-email',
        position: 'bottom-left',
        offset: { x: 40, y: 40 }
      });
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'E-mail ou senha inválidos.');
    } finally {
      this.loading = false;
    }
  }

  async confirmarCodigo() {
    if (!this.challengeId || !this.otp.every(d => d.length === 1)) {
      this.toast.error('Informe o código de 6 dígitos.');
      return;
    }

    this.loading = true;
    try {
      const resp = await this.authService.confirm2fa(this.challengeId, this.code);
      if (resp.status !== 204) throw new Error('Código inválido');

      // login final para receber tokens
      await this.authService.loginFinal({
        email: this.email,
        senha: this.senha,
        lembrar7Dias: this.remember,
      });

      this.utils.navegarPagina('/sistema');
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Código inválido ou expirado.');
    } finally {
      this.loading = false;
    }
  }
}
