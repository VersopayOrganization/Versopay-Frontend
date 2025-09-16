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
  userName = computed(() => this.auth.user()?.nome ?? 'Usuário');

  abrirInformacoes = false;
  abrirEnderecos = false;
  abrirDadosBancarios = false;
  abrirSaqueCripto = false;

  loading = false;

  // Mock de metas — traga do serviço depois
  metaTotal = 100_000;
  metaAtual = signal<number>(62_567.89);

  constructor(
    private usuarioService: UsuarioService,
    private toast: ToastService
  ) { }

  get progresso() {
    const v = Math.max(0, Math.min(1, this.metaAtual() / this.metaTotal));
    return Math.round(v * 100);
  }

  user = this.auth.user() as any;

  form = this.fb.group({
    nomeFantasia: [this.user?.nomeFantasia ?? '', [Validators.required]],
    razaoSocial: [this.user?.razaoSocial ?? '', [Validators.required]],
    cnpj: [this.user?.cpfCnpj ?? '', [Validators.minLength(11)]],
    email: [this.user?.email ?? '', [Validators.email]],
    site: [this.user?.site ?? ''],
    instagram: [this.user?.instagram ?? ''],
    enderecoCep: [this.user?.enderecoCep ?? '', [Validators.minLength(8)]],
    enderecoLogradouro: [this.user?.enderecoLogradouro ?? '', [Validators.required]],
    enderecoNumero: [this.user?.enderecoNumero ?? '', [Validators.required]],
    enderecoComplemento: [this.user?.enderecoComplemento ?? ''],
    enderecoBairro: [this.user?.enderecoBairro ?? '', [Validators.required]],
    enderecoCidade: [this.user?.enderecoCidade ?? '', [Validators.required]],
    enderecoUf: [this.user?.enderecoUF ?? this.user?.enderecoUf ?? '', [Validators.required]],

    nomeCompletoBanco: [this.user?.nomeCompletoBanco ?? '', [Validators.required]],
    cpfOrCnpj: [this.user?.cpfCnpj ?? '', [Validators.required]],
    chavePix: [this.user?.chavePix ?? '', [Validators.required]],
    chaveCarteiraCripto: [this.user?.chaveCarteiraCripto ?? '', [Validators.required]],
  });

  ngOnInit(): void {
    const partes = (this.userName() ?? '').split(' ').filter(Boolean);
    const p1 = partes[0]?.charAt(0) ?? '';
    const p2 = partes[1]?.charAt(0) ?? '';
    this.iniciaisNome = `${p1}${p2}`.toUpperCase() || (p1 || '?');
  }

  private onlyDigits(v?: string | null) {
    return (v ?? '').replace(/\D/g, '');
  }

  private buildPayloadFromForm() {
    const f = this.form.getRawValue();

    const payload = {
      nome: this.user?.nome ?? '',
      nomeFantasia: (f.nomeFantasia ?? '').trim(),
      razaoSocial: (f.razaoSocial ?? '').trim(),
      cnpj: this.onlyDigits(f.cnpj),
      email: (f.email ?? '').trim(),
      site: (f.site ?? '').trim(),
      instagram: (f.instagram ?? '').toString().replace(/^@/, '').trim(),
      enderecoCep: this.onlyDigits(f.enderecoCep),
      enderecoLogradouro: (f.enderecoLogradouro ?? '').trim(),
      enderecoNumero: (f.enderecoNumero ?? '').trim(),
      enderecoComplemento: (f.enderecoComplemento ?? '').trim(),
      enderecoBairro: (f.enderecoBairro ?? '').trim(),
      enderecoCidade: (f.enderecoCidade ?? '').trim(),
      enderecoUf: (f.enderecoUf ?? '').toString().toUpperCase(),
      nomeCompletoBanco: (f.nomeCompletoBanco ?? '').trim(),
      cpfCnpj: this.onlyDigits(f.cpfOrCnpj),
      chavePix: (f.chavePix ?? '').trim(),
      chaveCarteiraCripto: (f.chaveCarteiraCripto ?? '').trim(),
    };

    return payload;
  }

  async salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const idStr = this.auth.user()?.id;
    const id = idStr ? Number(idStr) : NaN;
    if (!Number.isFinite(id)) {
      this.toast.show({
        message: 'Usuário não encontrado na sessão.',
        type: 'error',
        position: 'top-right',
        offset: { x: 40, y: 40 },
      });
      return;
    }

    const payload = this.buildPayloadFromForm();

    this.loading = true;
    try {
      await this.usuarioService.update(id, payload as any);
      await this.auth.refresh();

      this.toast.show({
        message: 'Perfil atualizado com sucesso!',
        type: 'success',
        position: 'top-right',
        offset: { x: 40, y: 40 },
      });
    } catch (e: any) {
      this.toast.show({
        message: e?.message ?? 'Falha ao atualizar perfil.',
        type: 'error',
        position: 'top-right',
        offset: { x: 40, y: 40 },
      });
    } finally {
      this.loading = false;
    }
  }

  async redefinirSenha() {
    this.loading = true;
    try {
      const email = this.form.get('email')?.value ?? '';
      const result = await this.usuarioService.esqueciSenha({ email });
      if (result) {
        this.toast.show({
          message: 'Verifique seu e-mail',
          type: 'success-email',
          position: 'top-right',
          offset: { x: 40, y: 40 },
        });
      } else {
        this.toast.show({
          message: 'Não foi possível enviar a recuperação de senha para o e-mail informado.',
          type: 'error',
          position: 'top-right',
          offset: { x: 40, y: 40 },
        });
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Falha ao enviar e-mail de recuperação de senha. Tente novamente.';
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
