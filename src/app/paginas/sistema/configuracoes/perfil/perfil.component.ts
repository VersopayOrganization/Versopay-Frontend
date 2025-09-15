import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../auth/auth.service';
import { UsuarioService } from '../../../../services/usuario.service';
import { ToastService } from '../../../../shared/toast/toast.service';

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
  loading = false;

  // Mock de metas — Trazer do serviço depois
  metaTotal = 100_000;
  metaAtual = signal<number>(62_567.89);

  constructor(
    private usuarioService: UsuarioService,
    private toast: ToastService) { }

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

  async redefinirSenha() {
    try {
      const payload = {
        email: this.form.get('email')?.value
      }

      const result = await this.usuarioService.esqueciSenha(payload);
      console.log('result:', result)

      if (result) this.toast.show({ message: 'Verifique seu e-mail', type: 'success-email', position: 'top-right', offset: { x: 40, y: 40 } });
      else this.toast.show({ message: 'Não foi possível enviar a recuperação de senha para o e-mail informado.', type: 'error', position: 'top-right', offset: { x: 40, y: 40 } });
    } catch (err: any) {
      const msg = err.message ?? 'Falha ao enviar e-mail de recuperação de senha. Tente novamente.';
      this.toast.show({ message: msg, type: 'error', position: 'top-right', offset: { x: 40, y: 40 } });
    } finally {
      this.loading = false;
    }
  }

  toggleGroup(secao: Chave) {
    const mapa = {
      informacoes: 'abrirInformacoes',
      endereco: 'abrirEnderecos',
      dadosBancarios: 'abrirDadosBancarios',
      saqueCripto: 'abrirSaqueCripto',
    } as const;

    const prop = mapa[secao];
    const estavaAberta = (this as any)[prop] as boolean;

    this.abrirInformacoes = this.abrirEnderecos =
      this.abrirDadosBancarios = this.abrirSaqueCripto = false;

    (this as any)[prop] = !estavaAberta;
  }
}
