import { Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, Login2FARequired } from '../../../auth/auth.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { Utils } from '../../../shared/utils.service';
import { LoginPayload } from '../../../models/auth/login-payload.dto';

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
  private lastPayload!: LoginPayload;

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
    const payload: LoginPayload = {
      email: this.email!,
      senha: this.senha!,
      lembrar7Dias: this.remember ?? false
    };

    this.lastPayload = payload;

    if (!this.email || !this.senha) {
      this.toast.show({
        message: 'Todos os campos são obrigatórios.',
        type: 'warning',
        position: 'bottom-left',
        offset: { x: 40, y: 40 }
      });
      return;
    }

    this.loading = true;

    try {
      const res = await this.authService.loginSmart(payload);

      if (res.status === 200) {
        // tokens já persistidos aqui
        await this.router.navigateByUrl('/sistema', { replaceUrl: true });
        return;
      }

      // 202 -> precisa de 2FA (mostre UI para digitar código)
      const twofa = res.body as Login2FARequired;
      this.challengeId = twofa.challengeId;
      this.maskedEmail = twofa.maskedEmail;
      this.step = 'code';

    } catch (e: any) {
      this.toast.show({
        message: e?.message ?? 'Falha no login',
        type: 'error',
        position: 'bottom-left',
        offset: { x: 40, y: 40 }
      });
    } finally {
      this.loading = false;
    }
  }

  async confirmarCodigo() {
    if (!this.challengeId || !this.otp.every(d => d.length === 1)) {
      this.toast.show({ message: 'Informe o código de 6 dígitos.', type: 'error', position: 'bottom-left', offset: { x: 40, y: 40 } });
      return;
    }

    try {
      // Agora o confirm já persiste token/usuario/perfil/dashboard/taxas
      await this.authService.confirm2fa(this.challengeId!, this.code, this.remember);

      await this.router.navigateByUrl('/sistema', { replaceUrl: true });
    } catch (e: any) {
      this.toast.show({
        message: e?.message ?? 'Código inválido ou expirado',
        type: 'error',
        position: 'bottom-left',
        offset: { x: 40, y: 40 }
      });
    }
  }
}
