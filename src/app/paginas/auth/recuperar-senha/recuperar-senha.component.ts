import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Utils } from '../../../shared/utils.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { UsuarioService } from '../../../services/usuario.service';

@Component({
  selector: 'app-recuperar-senha',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recuperar-senha.component.html',
  styleUrl: './recuperar-senha.component.scss',
})
export class RecuperarSenhaComponent {
  backgroundImage = `url('assets/images/fundo-login.png')`;
  email = '';
  loading = false;
  concordarTermos = false;

  constructor(private utils: Utils, private toast: ToastService, private usuarioService: UsuarioService) { }

  navegarPagina(rota: string) {
    this.utils.navegarPagina(rota);
  }

  async submit() {
    if (!this.email) {
      this.toast.show({
        message: 'Todos os campos são obrigatórios.',
        type: 'warning',
        position: 'bottom-left',
        offset: { x: 40, y: 40 },
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
        email: this.email
      }

      const result = await this.usuarioService.esqueciSenha(payload);

      if (result) this.toast.show({ message: 'Verifique seu e-mail', type: 'success-email', position: 'bottom-left', offset: { x: 40, y: 40 } });
      else this.toast.show({ message: 'Não foi possível enviar a recuperação de senha para o e-mail informado.', type: 'error', position: 'bottom-left', offset: { x: 40, y: 40 } });
    } catch (err: any) {
      const msg = err.message ?? 'Falha ao enviar e-mail de recuperação de senha. Tente novamente.';
      this.toast.show({ message: msg, type: 'error', position: 'bottom-left', offset: { x: 40, y: 40 } });
    } finally {
      this.loading = false;
    }
  }
}
