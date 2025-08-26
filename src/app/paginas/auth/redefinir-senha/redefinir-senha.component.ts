import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Utils } from '../../../shared/utils.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { UsuarioService } from '../../../services/usuario.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-redefinir-senha',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './redefinir-senha.component.html',
  styleUrl: './redefinir-senha.component.scss'
})
export class RedefinirSenhaComponent implements OnInit {
  backgroundImage = `url('assets/images/fundo-login.png')`;
  senha = '';
  confirmarSenha = '';
  token: any;
  loading = false;
  erroToasterSenha: string = '';
  concordarTermos = false;

  constructor(
    private utils: Utils,
    private toast: ToastService,
    private usuarioService: UsuarioService,
    private route: ActivatedRoute) { }


  async ngOnInit() {
    this.loading = true;

    this.token = this.route.snapshot.queryParamMap.get('token');

    if (!this.token) {
      this.toast.show({ message: 'Link inválido ou expirado.', type: 'error', position: 'bottom-left', offset: { x: 40, y: 40 } });
      this.utils.navegarPagina('/auth/login');
      this.loading = false;
      return;
    }

    const valido = await this.usuarioService.validarTokenResetSenha(this.token);
    if (!valido) {
      this.toast.show({ message: 'Token inválido ou expirado.', type: 'error', position: 'bottom-left', offset: { x: 40, y: 40 } });
      this.utils.navegarPagina('/auth/login');
      this.loading = false;
      return;
    }

    this.loading = false;
  }

  private validarSenha(senha: string) {
    if (senha.length < 8) return this.erroToasterSenha = 'A senha deve conter no mínimo 8 caracteres.';
    if (senha.length > 70) return this.erroToasterSenha = 'A senha deve conter no máximo 70 caracteres.';
    if (!/[A-Z]/.test(senha)) return this.erroToasterSenha = 'A senha deve conter pelo menos uma letra maiúscula.';
    if (!/[a-z]/.test(senha)) return this.erroToasterSenha = 'A senha deve conter pelo menos uma letra minúscula.';
    if (!/\d/.test(senha)) return this.erroToasterSenha = 'A senha deve conter pelo menos um número.';
    if (!/[!@#$%&]/.test(senha)) return this.erroToasterSenha = 'A senha deve conter pelo menos um caracter especial.';
    return
  }

  navegarPagina(rota: string) {
    this.utils.navegarPagina(rota);
  }

  async submit() {
    if (!this.senha || !this.confirmarSenha) {
      this.toast.show({
        message: 'Todos os campos são obrigatórios.',
        type: 'warning',
        position: 'bottom-left',
        offset: { x: 40, y: 40 },
      });
      return;
    }

    if (this.senha !== this.confirmarSenha) {
      this.toast.show({
        message: 'As senhas precisam ser iguais.',
        type: 'warning',
        position: 'bottom-left',
        offset: { x: 40, y: 40 },
      });
      return;
    }

    if (this.validarSenha(this.senha)) {
      this.toast.show({
        message: this.erroToasterSenha,
        type: 'warning',
        position: 'bottom-left',
        offset: { x: 40, y: 40 }
      });
      return;
    }

    if (!this.concordarTermos) {
      this.toast.show({
        message:
          'Você precisa concordar com os Termos de Uso e a Política de Privacidade.',
        type: 'warning',
        position: 'bottom-left',
        offset: { x: 40, y: 40 },
      });
      return;
    }

    this.loading = true;

    try {
      const payload = {
        token: this.token,
        novaSenha: this.senha,
        confirmacao: this.confirmarSenha
      }

      const result = await this.usuarioService.reseterSenha(payload);

      if (result) {
        this.toast.show({ message: 'Senha redefinida com sucesso.', type: 'success', position: 'bottom-left', offset: { x: 40, y: 40 } });
        this.navegarPagina('/auth/login')
      } else this.toast.show({ message: 'Não foi possível cadastrar a redefinição de senha.', type: 'error', position: 'bottom-left', offset: { x: 40, y: 40 } });
    } catch (err: any) {
      const msg = err.message ?? 'Falha ao cadastrar redefinição de senha. Tente novamente.';
      this.toast.show({ message: msg, type: 'error', position: 'bottom-left', offset: { x: 40, y: 40 } });
    } finally {
      this.loading = false;
    }
  }
}
