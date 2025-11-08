import { Component, computed, inject, OnInit } from '@angular/core';
import { TipoCadastro } from '../../../../core/enums/tipo-cadastro.enum';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Utils } from '../../../../shared/utils.service';
import { ToastService } from '../../../../shared/toast/toast.service';
import { HttpClient } from '@angular/common/http';
import { distinctUntilChanged, map } from 'rxjs';
import { SelectBasicoComponent } from '../../../../shared/select-basico/select-basico.component';
import { MatDialogRef } from '@angular/material/dialog';
import { UsuarioService } from '../../../../services/usuario.service';
import { AuthService } from '../../../../auth/auth.service';
import { TipoContaBanco } from '../../../../core/enums/tipo-conta-banco.enum';

type DocCtrl = 'frenteDocumento' | 'versoDocumento' | 'selfie' | 'cartaoCnpj';

@Component({
  selector: 'app-modal-concluir-cadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectBasicoComponent],
  templateUrl: './modal-concluir-cadastro.component.html',
  styleUrl: './modal-concluir-cadastro.component.scss'
})
export class ModalConcluirCadastroComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private utils = inject(Utils);
  private toast = inject(ToastService);
  private http = inject(HttpClient);
  private dialogRef = inject(MatDialogRef<ModalConcluirCadastroComponent>, { optional: true });

  private ultimoCepObtido: string | null = null;

  steps = 1;
  tipoCadastro: TipoCadastro = null!;
  loading = false;
  tituloStep = 'Selecione o seu Tipo de Cadastro';

  readonly progress = [
    { label: 'Sobre você', step: 2 },
    { label: 'Sua Empresa', step: 3 },
    { label: 'Dados de pagamento', step: 4 },
    { label: 'Documentos', step: 5 },
  ];

  get progressFill(): number {
    const total = this.progress.length;
    const done = this.progress.filter(p => p.step < this.steps).length;
    const idxAtual = this.progress.findIndex(p => p.step === this.steps);
    const parcial = idxAtual >= 0 ? 1 : 0;
    const fill = Math.min(done + parcial, total);
    return (fill / total) * 100;
  }

  canClick(_targetStep: number): boolean { return true; }

  async onProgressClick(item: { label: string; step: number }) {
    if (item.step === this.steps) return;

    if (item.step < this.steps) {
      this.steps = item.step;
      this.tituloStep = this.definirNomeStep();
      return;
    }

    const origem = this.steps;
    for (let s = origem; s < item.step; s++) {
      const ok = await this.validateStepAsync(s);
      if (!ok) {
        this.steps = s;
        this.tituloStep = this.definirNomeStep();
        return;
      }
      this.steps = s + 1;
      this.tituloStep = this.definirNomeStep();
    }
  }

  readonly produtos = [
    { key: 'infoprodutos', label: 'Infoprodutos' },
    { key: 'dropshipping', label: 'Dropshipping' },
    { key: 'saas', label: 'SaaS' },
    { key: 'subaquirente', label: 'Subaquirente' },
    { key: 'ecommerce', label: 'Ecommerce' },
  ];

  form = this.fb.group({
    cpf: ['', [Validators.required]],
    nome: ['', [Validators.required]],
    instagram: [''],
    telefone: ['', [Validators.required, this.utils.telefoneValidator()]],
    enderecoCep: ['', [Validators.required]],
    enderecoLogradouro: ['', [Validators.required]],
    numero: ['', [Validators.required]],
    enderecoBairro: ['', [Validators.required]],
    enderecoCidade: ['', [Validators.required]],
    cnpj: [''],
    razaoSocial: [''],
    produtos: this.fb.control<string[]>([], [this.utils.minArrayLength(1)]),
    codigoBanco: ['', [Validators.required]],
    nomeBanco: ['', [Validators.required]],
    tipoContaBanco: ['', [Validators.required]],
    agencia: ['', [Validators.required]],
    numeroConta: ['', [Validators.required]],
    digitoConta: ['', [Validators.required]],
    chavePix: [''],
    frenteDocumento: [null as File | null, [Validators.required]],
    versoDocumento: [null as File | null, [Validators.required]],
    selfie: [null as File | null, [Validators.required]],
    cartaoCnpj: [null as File | null],

    // STEP 6 — termos
    aceitarTermos: [false, [Validators.requiredTrue]],
  });

  selectedDocs: Record<DocCtrl, File | null> = {
    frenteDocumento: null,
    versoDocumento: null,
    selfie: null,
    cartaoCnpj: null,
  };
  dragOver: Record<string, boolean> = {};

  private readonly ACCEPT_BY_CTRL: Record<DocCtrl, string[]> = {
    frenteDocumento: ['image/jpeg', 'image/jpg', 'image/png'],
    versoDocumento: ['image/jpeg', 'image/jpg', 'image/png'],
    selfie: ['image/jpeg', 'image/jpg', 'image/png'],
    cartaoCnpj: ['application/pdf'],
  };
  private readonly MAX_MB = 10;

  get produtosSelecionados(): string[] {
    return (this.form.get('produtos')?.value as string[]) ?? [];
  }
  get allSelected(): boolean { return this.produtosSelecionados.length === this.produtos.length; }
  get someSelected(): boolean { return this.produtosSelecionados.length > 0 && !this.allSelected; }

  ngOnInit() {
    this.mascarasEBuscaCEP();
  }

  private mascarasEBuscaCEP() {
    const cepCtrl = this.form.get('enderecoCep')!;
    const cnpjCtrl = this.form.get('cnpj')!;
    const docCtrl = this.form.get('cpf')!;
    const telCtrl = this.form.get('telefone')!;

    cepCtrl.valueChanges
      .pipe(map(v => this.utils.onlyDigits(v)), distinctUntilChanged())
      .subscribe(digits => {
        const masked = this.utils.maskCep(digits);
        if (masked !== cepCtrl.value) cepCtrl.setValue(masked, { emitEvent: false });
        if (digits.length === 8 && digits !== this.ultimoCepObtido) {
          this.ultimoCepObtido = digits;
          // this.fetchCepAndAutofill(digits);
        }
      });

    cnpjCtrl.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(v => {
        const masked = this.utils.maskCnpj(v ?? '');
        if (masked !== cnpjCtrl.value) cnpjCtrl.setValue(masked, { emitEvent: false });
      });

    docCtrl.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(v => {
        const masked = this.utils.maskCpf(v ?? '');
        if (masked !== docCtrl.value) docCtrl.setValue(masked, { emitEvent: false });
      });

    telCtrl.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(v => {
        const masked = this.utils.maskTelefone(v);
        if (masked !== v) telCtrl.setValue(masked, { emitEvent: false });
      });
  }

  private async fetchCepAndAutofill(cepDigits: string) {
    this.loading = true;
    try {
      const data: any = await this.http.get(`https://viacep.com.br/ws/${cepDigits}/json/`).toPromise();
      if (!data || data.erro) {
        this.toast.show({ message: 'CEP não encontrado.', type: 'warning', position: 'top-right', offset: { x: 40, y: 40 } });
        return;
      }
      this.form.patchValue({
        enderecoLogradouro: data.logradouro ?? '',
        enderecoBairro: data.bairro ?? '',
        enderecoCidade: data.localidade ?? '',
      }, { emitEvent: false });
    } catch {
      this.toast.show({ message: 'Falha ao buscar CEP. Tente novamente.', type: 'error', position: 'top-right', offset: { x: 40, y: 40 } });
    } finally {
      this.loading = false;
    }
  }

  onSelectTipoCadastro(tipoCadastro: TipoCadastro) {
    this.tipoCadastro = tipoCadastro;
    this.applyTipoValidators();
  }

  private applyTipoValidators() {
    const isPJ = this.tipoCadastro === TipoCadastro.PessoaJuridica;
    const cnpj = this.form.get('cnpj')!;
    const rz = this.form.get('razaoSocial')!;
    const cartao = this.form.get('cartaoCnpj')!;

    if (isPJ) {
      cnpj.setValidators([Validators.required]);
      rz.setValidators([Validators.required]);
      if (this.steps === 5) cartao.setValidators([Validators.required]);
    } else {
      cnpj.clearValidators();
      rz.clearValidators();
      cartao.clearValidators();
    }
    cnpj.updateValueAndValidity({ emitEvent: false });
    rz.updateValueAndValidity({ emitEvent: false });
    cartao.updateValueAndValidity({ emitEvent: false });
  }

  async onAvancar(next: number) {
    if (this.steps === 1 && this.tipoCadastro === null) {
      this.toast.show({
        message: 'Deve selecionar um tipo de cadastro.',
        type: 'warning',
        position: 'top-right',
        offset: { x: 40, y: 40 },
      });
      return;
    }

    if (!this.validateStep(this.steps)) return;

    if (this.steps === 6 && next === 7) {
      try {
        this.loading = true;
        const userId = this.auth.user()?.id;
        const payload = await this.buildPayload();
        await this.usuarioService.completarCadastro(userId, payload);
        this.steps = next;
      } catch (e: any) {
        this.toast.show({
          message: e?.message ?? 'Falha ao enviar seus dados. Tente novamente.',
          type: 'error',
          position: 'top-right',
          offset: { x: 40, y: 40 },
        });
        return;
      } finally {
        this.loading = false;
      }
      return;
    }

    if (this.steps === 2 || this.steps === 3 || this.steps === 5) {
      this.applyTipoValidators();
    }
    this.steps = next;
    this.tituloStep = this.definirNomeStep();
  }

  definirNomeStep() {
    switch (this.steps) {
      case 1: return 'Selecione o seu Tipo de Cadastro';
      case 2: return 'Me Conte Sobre Você';
      case 3: return this.tipoCadastro === TipoCadastro.PessoaFisica
        ? 'Sobre Você' : 'Sobre sua Empresa';
      case 4: return 'Finalizar Cadastro';
      case 5: return 'Documentos';
      case 6: return 'Termo de uso e Políticas de privacidade';
      case 7: return 'Obrigado por enviar seus dados!';
      default: return '';
    }
  }

  onVoltar(step: number) {
    this.steps = step;
    this.tituloStep = this.definirNomeStep();
  }

  fechar(result: 'cancel' | 'confirm' | Record<string, any> = 'cancel') {
    this.dialogRef?.close(result);
  }

  private getRequiredForStep(step: number): string[] {
    const s2 = ['cpf', 'nome', 'telefone'];
    const s3 = ['enderecoCep', 'enderecoLogradouro', 'numero', 'enderecoBairro', 'enderecoCidade', 'produtos'];
    const s4 = ['codigoBanco', 'nomeBanco', 'tipoContaBanco', 'agencia', 'numeroConta', 'digitoConta'];
    const s5 = ['frenteDocumento', 'versoDocumento', 'selfie'];
    const s6 = ['aceitarTermos']; 

    if (step === 2) return s2;
    if (step === 3) {
      const base = [...s3];
      if (this.tipoCadastro === TipoCadastro.PessoaJuridica) base.push('cnpj', 'razaoSocial');
      return base;
    }
    if (step === 4) return s4;
    if (step === 5) {
      const base = [...s5];
      if (this.tipoCadastro === TipoCadastro.PessoaJuridica) base.push('cartaoCnpj');
      return base;
    }
    if (step === 6) return s6;
    return [];
  }

  private validateStep(step: number): boolean {
    const required = this.getRequiredForStep(step);
    if (required.length === 0) return true;
    this.applyTipoValidators();

    let ok = true;
    for (const name of required) {
      const c = this.form.get(name) as AbstractControl | null;
      if (!c) continue;
      c.markAsTouched();
      c.updateValueAndValidity({ onlySelf: true });
      if (c.invalid) ok = false;
    }

    if (!ok) {
      this.toast.show({
        message: 'Preencha os campos obrigatórios antes de continuar.',
        type: 'warning',
        position: 'top-right',
        offset: { x: 40, y: 40 },
      });
    }
    return ok;
  }

  private async validateStepAsync(step: number): Promise<boolean> {
    return this.validateStep(step);
  }

  private validateCurrentStep(): boolean {
    return this.validateStep(this.steps);
  }

  isInvalid(name: string) {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.loading);
  }

  toggleOne(key: string, ev?: Event | boolean) {
    const isChecked = typeof ev === 'boolean' ? ev : !!(ev as any)?.target?.checked;
    const set = new Set(this.produtosSelecionados);
    isChecked ? set.add(key) : set.delete(key);
    this.form.get('produtos')?.setValue([...set], { emitEvent: false });
  }
  isChecked(key: string) { return this.produtosSelecionados.includes(key); }

  private validateFile(ctrlName: DocCtrl, file: File): string | null {
    const allow = this.ACCEPT_BY_CTRL[ctrlName] || [];
    if (!allow.includes(file.type)) {
      const esperado = ctrlName === 'cartaoCnpj' ? 'PDF' : 'imagem (JPG/PNG)';
      return `Formato inválido para "${this.prettyCtrl(ctrlName)}". Envie ${esperado}.`;
    }
    const mb = file.size / (1024 * 1024);
    if (mb > this.MAX_MB) return `Arquivo muito grande (${mb.toFixed(1)}MB). Máx. ${this.MAX_MB}MB.`;
    return null;
  }
  private prettyCtrl(c: DocCtrl) {
    return c === 'frenteDocumento' ? 'Frente do documento'
      : c === 'versoDocumento' ? 'Verso do documento'
        : c === 'selfie' ? 'Selfie'
          : 'Cartão CNPJ';
  }

  openPicker(_ctrlName: DocCtrl, input: HTMLInputElement) { input.click(); }

  onFilePicked(ctrlName: DocCtrl, ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    const err = this.validateFile(ctrlName, file);
    if (err) {
      this.toast.show({ message: err, type: 'warning', position: 'top-right', offset: { x: 40, y: 40 } });
      input.value = '';
      return;
    }

    this.selectedDocs[ctrlName] = file;
    this.form.get(ctrlName)?.setValue(file);
    this.form.get(ctrlName)?.markAsDirty();
    this.form.get(ctrlName)?.markAsTouched();
  }

  onDragOver(ctrlName: string, ev: DragEvent) { ev.preventDefault(); this.dragOver[ctrlName] = true; }
  onDragLeave(ctrlName: string, _ev: DragEvent) { this.dragOver[ctrlName] = false; }

  onDrop(ctrlName: DocCtrl, ev: DragEvent) {
    ev.preventDefault();
    this.dragOver[ctrlName] = false;
    const f = ev.dataTransfer?.files?.[0];
    if (!f) return;

    const err = this.validateFile(ctrlName, f);
    if (err) {
      this.toast.show({ message: err, type: 'warning', position: 'top-right', offset: { x: 40, y: 40 } });
      return;
    }

    this.selectedDocs[ctrlName] = f;
    this.form.get(ctrlName)?.setValue(f);
    this.form.get(ctrlName)?.markAsDirty();
    this.form.get(ctrlName)?.markAsTouched();
  }

  fileLabel(ctrlName: DocCtrl): string {
    const f = this.selectedDocs[ctrlName];
    return f ? f.name : 'Clique ou arraste para fazer upload';
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
      reader.onload = () => {
        const res = String(reader.result || '');
        const base64 = res.includes(',') ? res.split(',')[1] : res;
        resolve(base64);
      };
      reader.readAsDataURL(file);
    });
  }

  private async buildPayload(): Promise<any> {
    const raw = this.form.getRawValue();

    const frenteB64 = this.selectedDocs.frenteDocumento ? await this.fileToBase64(this.selectedDocs.frenteDocumento) : null;
    const versoB64 = this.selectedDocs.versoDocumento ? await this.fileToBase64(this.selectedDocs.versoDocumento) : null;
    const selfieB64 = this.selectedDocs.selfie ? await this.fileToBase64(this.selectedDocs.selfie) : null;
    const cartaoB64 = (this.tipoCadastro === TipoCadastro.PessoaJuridica && this.selectedDocs.cartaoCnpj)
      ? await this.fileToBase64(this.selectedDocs.cartaoCnpj)
      : null;

    const tipoContaEnum =
      (String(raw.tipoContaBanco || '').toLowerCase() === 'corrente')
        ? TipoContaBanco.Corrente
        : TipoContaBanco.Poupanca;

    const body: any = {
      tipoCadastro: this.tipoCadastro,
      cpf: this.utils.onlyDigits(raw.cpf),
      nome: raw.nome ?? '',
      instagram: (raw.instagram ?? '').toString().replace(/^@/, '').trim(),
      telefone: this.utils.onlyDigits(raw.telefone),
      enderecoCep: this.utils.onlyDigits(raw.enderecoCep),
      enderecoLogradouro: raw.enderecoLogradouro ?? '',
      numero: raw.numero ?? '',
      enderecoBairro: raw.enderecoBairro ?? '',
      enderecoCidade: (raw.enderecoCidade ?? '').toString().trim(),
      cnpj: this.tipoCadastro === TipoCadastro.PessoaJuridica ? this.utils.onlyDigits(raw.cnpj) : '',
      razaoSocial: this.tipoCadastro === TipoCadastro.PessoaJuridica ? (raw.razaoSocial ?? '') : '',
      produtos: raw.produtos ?? [],
      codigoBanco: raw.codigoBanco ?? '',
      nomeBanco: raw.nomeBanco ?? '',
      tipoContaBanco: tipoContaEnum,
      agencia: raw.agencia ?? '',
      numeroConta: raw.numeroConta ?? '',
      digitoConta: raw.digitoConta ?? '',
      chavePix: raw.chavePix ?? '',
      frenteDocumento: frenteB64,
      versoDocumento: versoB64,
      selfie: selfieB64,
      cartaoCnpj: cartaoB64
    };

    return body;
  }
}
