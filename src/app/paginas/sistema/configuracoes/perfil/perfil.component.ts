import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../auth/auth.service';

type Chave = 'informacoes' | 'endereco' | 'dadosBancarios' | 'saqueCripto';

@Component({
  standalone: true,
  selector: 'app-perfil',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
})
export class PerfilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  iniciaisNome: string = '';
  userName = computed(() => this.auth.user()?.name ?? 'Usuário');
  abrirInformacoes: boolean = false;
  abrirEnderecos: boolean = false;
  abrirDadosBancarios: boolean = false;
  abrirSaqueCripto: boolean = false;

  // Mock de metas — Trazer do serviço depois
  metaTotal = 100_000;
  metaAtual = signal<number>(62_567.89);
  get progresso() {
    const v = Math.max(0, Math.min(1, this.metaAtual() / this.metaTotal));
    return Math.round(v * 100);
  }

  user = this.auth.user();

  form = this.fb.group({
    nomeFantasia: [''],
    razaoSocial: [''],
    cnpj: ['', [Validators.minLength(11)]],
    email: [this.user?.email ?? '', [Validators.email]],
    site: [''],
    instagram: [''],

    enderecoCep: [''],
    enderecoLogradouro: [''],
    enderecoNumero: [''],
    enderecoComplemento: [''],
    enderecoBairro: [''],
    enderecoCidade: [''],
    enderecoUf: [''],

    nomeCompletoBanco: [''],
    cpfOrCnpj: [''],
    chavePix: [''],

    chaveCarteiraCripto: [''],
  });

  ngOnInit(): void {
    const primeiroNome = this.userName().split(' ')[0].slice(0, 1);
    const segundoNome = this.userName().split(' ')[1].slice(0, 1)
    this.iniciaisNome = `${primeiroNome}${segundoNome}`.toUpperCase();
    console.log(this.iniciaisNome)
  }

  salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // TODO: integrar com API
    console.log('Perfil -> payload', this.form.getRawValue());
    // exiba seu toast de sucesso aqui
  }

  redefinirSenha() {
    // aqui você pode navegar para a rota de reset ou abrir modal
    // this.router.navigate(['/auth/reset']);
    console.log('Abrir fluxo de redefinição de senha');
  }

  toggleGroup(secao: Chave) {
    // mapeia a chave para o nome da propriedade
    const mapa = {
      informacoes: 'abrirInformacoes',
      endereco: 'abrirEnderecos',     // 👈 note o plural aqui
      dadosBancarios: 'abrirDadosBancarios',
      saqueCripto: 'abrirSaqueCripto',
    } as const;

    const prop = mapa[secao];
    const estavaAberta = (this as any)[prop] as boolean;

    // fecha todas
    this.abrirInformacoes = this.abrirEnderecos =
      this.abrirDadosBancarios = this.abrirSaqueCripto = false;

    // reabre somente se não era a mesma (efeito toggle)
    (this as any)[prop] = !estavaAberta;
  }
}
