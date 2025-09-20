import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';

import { AuthService } from '../../../../auth/auth.service';
import { UsuarioService } from '../../../../services/usuario.service';
import { ToastService } from '../../../../shared/toast/toast.service';
import { TipoCadastro } from '../../../../core/enums/tipo-cadastro.enum';
import { Utils } from '../../../../shared/utils.service';

type Chave = 'informacoes' | 'endereco' | 'dadosBancarios' | 'saqueCripto';

@Component({
  standalone: true,
  selector: 'app-perfil',
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
})
export class PerfilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private usuarioService = inject(UsuarioService);
  private toast = inject(ToastService);
  private utils = inject(Utils);

  iniciaisNome: string = '';
  userName = computed(() => this.auth.user()?.nome ?? 'Usuário');

  abrirInformacoes = false;
  abrirEnderecos = false;
  abrirDadosBancarios = false;
  abrirSaqueCripto = false;

  loading = false;

  // Progresso (mock)
  metaTotal = 100_000;
  metaAtual = signal<number>(62_567.89);

  private ultimoCepObtido: string | null = null;

  get progresso() {
    const v = Math.max(0, Math.min(1, this.metaAtual() / this.metaTotal));
    return Math.round(v * 100);
  }

  user = this.auth.user() as any;

  form = this.fb.group({
    nomeFantasia: [this.user?.nomeFantasia ?? '', [Validators.required]],
    razaoSocial: [this.user?.razaoSocial ?? '', [Validators.required]],
    cpfCnpj: [this.user?.cpfCnpj ?? '', [Validators.minLength(11)]],
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
    cpfCnpjDadosBancarios: [this.user?.cpfCnpjDadosBancarios ?? '', [Validators.required]],
    chavePix: [this.user?.chavePix ?? '', [Validators.required]],
    chaveCarteiraCripto: [this.user?.chaveCarteiraCripto ?? '', [Validators.required]],
  });

  ngOnInit(): void {
    const partes = (this.userName() ?? '').split(' ').filter(Boolean);
    const p1 = partes[0]?.charAt(0) ?? '';
    const p2 = partes[1]?.charAt(0) ?? '';
    this.iniciaisNome = `${p1}${p2}`.toUpperCase() || (p1 || '?');

    this.mascarasEBuscaCEP();
  }


  private normalizeUrl(raw?: string | null): string {
    const v = (raw ?? '').trim();
    if (!v) return '';
    if (/^[a-zA-Z][\w+.-]*:\/\//.test(v)) return v;
    if (/^\/\//.test(v)) return `https:${v}`;
    return `https://${v}`;
  }

  // ====== Liga máscaras e ViaCEP ======
  private mascarasEBuscaCEP() {
    const cepCtrl = this.form.get('enderecoCep')!;
    const cnpjCtrl = this.form.get('cpfCnpjDadosBancarios')!;
    const docCtrl = this.form.get('cpfCnpj')!;
    const siteCtrl = this.form.get('site')!;

    cepCtrl.valueChanges
      .pipe(
        map(v => this.utils.onlyDigits(v)),
        distinctUntilChanged()
      )
      .subscribe(digits => {
        const masked = this.utils.maskCep(digits);
        if (masked !== cepCtrl.value) {
          cepCtrl.setValue(masked, { emitEvent: false });
        }

        if (digits.length === 8 && digits !== this.ultimoCepObtido) {
          this.ultimoCepObtido = digits;
          this.fetchCepAndAutofill(digits);
        }
      });

    cnpjCtrl.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(v => {
        const masked = this.utils.maskCnpj(v ?? '');
        if (masked !== cnpjCtrl.value) {
          cnpjCtrl.setValue(masked, { emitEvent: false });
        }
      });

    docCtrl.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(v => {
        const masked = this.utils.maskCpfCnpj(v ?? '');
        if (masked !== docCtrl.value) {
          docCtrl.setValue(masked, { emitEvent: false });
        }
      });

    // Site: normaliza para URL com esquema (https://) — após pequena pausa
    siteCtrl.valueChanges
      .pipe(
        debounceTime(200),
        distinctUntilChanged()
      )
      .subscribe(v => {
        if (!v) return;
        const normalized = this.normalizeUrl(v);
        const needs = normalized !== v && /\./.test(v) && !/^[a-zA-Z][\w+.-]*:\/\//.test(v);
        if (needs) {
          siteCtrl.setValue(normalized, { emitEvent: false });
        }
      });
  }

  private async fetchCepAndAutofill(cepDigits: string) {
    this.loading = true;
    try {
      const data: any = await this.http
        .get(`https://viacep.com.br/ws/${cepDigits}/json/`)
        .toPromise();

      if (!data || data.erro) {
        this.toast.show({
          message: 'CEP não encontrado.',
          type: 'warning',
          position: 'top-right',
          offset: { x: 40, y: 40 },
        });
        return;
      }

      // Mapeia campos do ViaCEP
      this.form.patchValue(
        {
          enderecoLogradouro: data.logradouro ?? '',
          enderecoBairro: data.bairro ?? '',
          enderecoCidade: data.localidade ?? '',
          enderecoUf: (data.uf ?? '').toString().toUpperCase(),
        },
        { emitEvent: false }
      );

      this.loading = false;
    } catch {
      this.loading = false;

      this.toast.show({
        message: 'Falha ao buscar CEP. Tente novamente.',
        type: 'error',
        position: 'top-right',
        offset: { x: 40, y: 40 },
      });
    }
  }

  // ====== Payload & Ações ======
  private buildPayloadFromForm() {
    const f = this.form.getRawValue();

    const payload = {
      nome: this.user?.nome ?? '',
      nomeFantasia: (f.nomeFantasia ?? '').trim(),
      razaoSocial: (f.razaoSocial ?? '').trim(),
      tipoCadastro: TipoCadastro.PessoaJuridica,
      cpfCnpj: this.utils.onlyDigits(f.cpfCnpj),
      cpfCnpjDadosBancarios: this.utils.onlyDigits(f.cpfCnpjDadosBancarios),
      email: (f.email ?? '').trim(),
      site: this.normalizeUrl(f.site),
      instagram: (f.instagram ?? '').toString().replace(/^@/, '').trim(),
      enderecoCep: this.utils.onlyDigits(f.enderecoCep),
      enderecoLogradouro: (f.enderecoLogradouro ?? '').trim(),
      enderecoNumero: (f.enderecoNumero ?? '').trim(),
      enderecoComplemento: (f.enderecoComplemento ?? '').trim(),
      enderecoBairro: (f.enderecoBairro ?? '').trim(),
      enderecoCidade: (f.enderecoCidade ?? '').trim(),
      enderecoUf: (f.enderecoUf ?? '').toString().toUpperCase(),
      nomeCompletoBanco: (f.nomeCompletoBanco ?? '').trim(),
      chavePix: (f.chavePix ?? '').trim(),
      chaveCarteiraCripto: (f.chaveCarteiraCripto ?? '').trim(),
    };

    return payload;
  }

  async salvar() {
    if (this.form.invalid) {
      this.toast.show({
        message: 'Verifique os campos e tente novamente.',
        type: 'error',
        position: 'top-right',
        offset: { x: 40, y: 40 },
      });
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
