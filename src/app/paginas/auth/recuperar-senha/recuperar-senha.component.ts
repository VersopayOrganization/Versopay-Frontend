import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Utils } from '../../../shared/utils.service';

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

  constructor(private utils: Utils) {}

  navegarPagina(rota: string) {
    this.utils.navegarPagina(rota);
  }

  submit() {}
}
