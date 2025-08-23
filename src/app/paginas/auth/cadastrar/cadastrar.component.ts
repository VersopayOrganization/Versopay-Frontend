import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastService } from '../../../shared/toast/toast.service';
import { UsuarioService } from '../../../services/usuario.service';

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
  erroToasterSenha: string = '';

  constructor(
    private toast: ToastService,
    private router: Router,
    private usuarioService: UsuarioService
  ) { }

  private validarSenha(senha: string) {
    if (senha.length < 8) return this.erroToasterSenha ='A senha deve conter no mínimo 8 caracteres.';
    if (senha.length > 70) return this.erroToasterSenha = 'A senha deve conter no máximo 70 caracteres.';
    if (!/[A-Z]/.test(senha)) return this.erroToasterSenha = 'A senha deve conter pelo menos uma letra maiúscula.';
    if (!/[a-z]/.test(senha)) return this.erroToasterSenha = 'A senha deve conter pelo menos uma letra minúscula.';
    if (!/\d/.test(senha)) return this.erroToasterSenha = 'A senha deve conter pelo menos um número.';
    if (!/[!@#$%&]/.test(senha)) return this.erroToasterSenha = 'A senha deve conter pelo menos um caracter especial.';
    return
  }

  async submit() {
    if (!this.nome || !this.email || !this.senha || !this.confirmacaoSenha) {
      this.toast.show({message:'Todos os campos são obrigatórios.', type: 'warning', position: 'bottom-left', offset: { x: 40, y: 40 }});
      return;
    }

    if (!this.concordarTermos) {
      this.toast.show({message:'Você precisa concordar com os Termos de Uso e a Política de Privacidade.', type: 'warning', position: 'bottom-left', offset: { x: 40, y: 40 }});
      return;
    }

    if (this.senha !== this.confirmacaoSenha) {
      this.toast.show({message:'As senhas precisam ser igual.', type: 'warning', position: 'bottom-left', offset: { x: 40, y: 40 }});
      return;
    }

    if (this.validarSenha(this.senha)) {
      this.toast.show({message:this.erroToasterSenha, type: 'warning', position: 'bottom-left', offset: { x: 40, y: 40 }});
      return;
    }

    this.loading = true;

    try {
      const payload: RegistrarPayload = {
        nome: this.nome.trim(),
        email: this.email.trim().toLowerCase(),
        senha: this.senha
      };

      const ok = await this.usuarioService.create(payload);
      if (ok) this.router.navigateByUrl('/dashboard');
      else this.toast.show({message: 'Cadastro realizado com sucesso! Faça login para continuar.', type: 'success', position: 'bottom-left', offset: { x: 40, y: 40 }});
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Falha ao cadastrar. Tente novamente.';
      this.toast.show({message: msg, type: 'error', position: 'bottom-left', offset: { x: 40, y: 40 }});
    } finally {
      this.loading = false;
    }
  }
}
