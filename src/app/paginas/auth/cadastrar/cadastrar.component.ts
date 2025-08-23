import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastService } from '../../../shared/toast/toast.service';

type RegistrarPayload = {
  nome: string;
  email: string;
  senha: string;
};

@Component({
  selector: 'app-cadastrar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cadastrar.component.html',
  styleUrl: './cadastrar.component.scss'
})
export class CadastrarComponent {
  backgroundImage = `url('assets/images/fundo-login.png')`;

  nome = '';
  email = '';
  senha = '';
  confirmacaoSenha = '';
  concordarTermos = false;
  loading = false;

  senhaErrors: string[] = [];

  // se você já usa environments, troque por environment.apiUrl
  private readonly API = '/api/Usuarios';

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private router: Router
  ) { }

  /** Valida a senha e retorna uma lista de mensagens de erro (se houver) */
  private validarSenha(senha: string): string[] {
    const errs: string[] = [];
    if (senha.length < 8) errs.push('A senha deve conter no mínimo 8 caracteres.');
    if (senha.length > 70) errs.push('A senha deve conter no máximo 70 caracteres.');
    if (!/[A-Z]/.test(senha)) errs.push('A senha deve conter pelo menos uma letra maiúscula.');
    if (!/[a-z]/.test(senha)) errs.push('A senha deve conter pelo menos uma letra minúscula.');
    if (!/\d/.test(senha)) errs.push('A senha deve conter pelo menos um número.');
    if (!/[!@#$%&]/.test(senha)) errs.push('A senha deve conter pelo menos um caracter especial.');
    return errs;
  }

  async submit() {
    // campos obrigatórios
    if (!this.nome || !this.email || !this.senha || !this.confirmacaoSenha) {
      this.toast.error('Todos os campos são obrigatórios.', 'top-center');
      return;
    }

    // termos
    if (!this.concordarTermos) {
      this.toast.error('Você precisa concordar com os Termos de Uso e a Política de Privacidade.', 'top-center');
      return;
    }

    // senha = confirmação
    if (this.senha !== this.confirmacaoSenha) {
      this.toast.error('A confirmação de senha não confere.', 'top-center');
      return;
    }

    // validações de complexidade
    this.senhaErrors = this.validarSenha(this.senha);
    if (this.senhaErrors.length) {
      // mostra via toast (além da lista opcional abaixo do campo)
      this.toast.error(this.senhaErrors.join('\n'), 'top-center');
      return;
    }

    // tudo ok → chama a API
    this.loading = true;
    try {
      const payload: RegistrarPayload = {
        nome: this.nome.trim(),
        email: this.email.trim().toLowerCase(),
        senha: this.senha
      };

      // await this.http.post(this.API, payload, { withCredentials: true }).toPromise();

      this.toast.success('Cadastro realizado com sucesso! Faça login para continuar.', 'top-center');
      // this.router.navigateByUrl('/auth/login');
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Falha ao registrar. Tente novamente.';
      this.toast.error(msg, 'top-center');
    } finally {
      this.loading = false;
    }
  }
}
