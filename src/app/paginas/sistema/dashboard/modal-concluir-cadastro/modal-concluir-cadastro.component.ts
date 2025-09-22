import { Component, inject, OnInit } from '@angular/core';
import { TipoCadastro } from '../../../../core/enums/tipo-cadastro.enum';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Utils } from '../../../../shared/utils.service';
import { ToastService } from '../../../../shared/toast/toast.service';
import { HttpClient } from '@angular/common/http';
import { distinctUntilChanged, map } from 'rxjs';
import { SelectBasicoComponent } from '../../../../shared/select-basico/select-basico.component';

type DocCtrl = 'frenteDocumento' | 'versoDocumento' | 'selfie' | 'cartaoCnpj';

@Component({
  selector: 'app-modal-concluir-cadastro',
  imports: [CommonModule, ReactiveFormsModule, SelectBasicoComponent],
  templateUrl: './modal-concluir-cadastro.component.html',
  styleUrl: './modal-concluir-cadastro.component.scss'
})
export class ModalConcluirCadastroComponent implements OnInit {
  private fb = inject(FormBuilder);
  private utils = inject(Utils);
  private toast = inject(ToastService);
  private http = inject(HttpClient);
  private ultimoCepObtido: string | null = null;

  steps = 1;
  tipoCadastro: TipoCadastro = TipoCadastro.PessoaFisica;
  loading = false;

  readonly produtos = [
    { key: 'infoprodutos', label: 'Infoprodutos' },
    { key: 'ecommerceTradicional', label: 'Ecommerce Tradicional' },
    { key: 'saas', label: 'SaaS' },
    { key: 'dropshipping', label: 'Dropshipping' },
    { key: 'nutraceutico', label: 'Nútraceutico (Encapsulados, gotas, etc...)' },
  ];

  // ===== Form =====
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
    cidadeBanco: ['', [Validators.required]],
    chavePix: [''],

    // Arquivos: guardamos File | null
    frenteDocumento: [null as File | null, [Validators.required]],
    versoDocumento: [null as File | null, [Validators.required]],
    selfie: [null as File | null, [Validators.required]],
    cartaoCnpj: [null as File | null], // obrigatório no step 5 somente para PJ
  });

  // ===== Estado de upload =====
  selectedDocs: Record<DocCtrl, File | null> = {
    frenteDocumento: null,
    versoDocumento: null,
    selfie: null,
    cartaoCnpj: null,
  };
  dragOver: Record<string, boolean> = {};

  // Regras por campo
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

  // ===== Init =====
  ngOnInit() {
    this.mascarasEBuscaCEP();
  }

  // ===== Máscaras + ViaCEP =====
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
          this.fetchCepAndAutofill(digits);
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

  // ===== Fluxo de steps =====
  onSelectTipoCadastro(tipoCadastro: TipoCadastro) {
    this.tipoCadastro = tipoCadastro;
    this.applyTipoValidators();
    this.steps = 2;
  }

  private applyTipoValidators() {
    const isPJ = this.tipoCadastro === TipoCadastro.PessoaJuridica;
    const cnpj = this.form.get('cnpj')!;
    const rz = this.form.get('razaoSocial')!;
    const cartao = this.form.get('cartaoCnpj')!;

    if (isPJ) {
      cnpj.setValidators([Validators.required]);
      rz.setValidators([Validators.required]);
      // no step 5, cartaoCnpj também será obrigatório
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

  onAvancar(next: number) {
    if (!this.validateCurrentStep()) return;

    if (this.steps === 2 || this.steps === 3 || this.steps === 5) {
      this.applyTipoValidators();
    }
    this.steps = next;
  }

  onVoltar(step: number) {
    this.steps = step;
  }

  fechar() { }

  private getRequiredForStep(step: number): string[] {
    const s2 = ['cpf', 'nome', 'telefone'];
    const s3 = ['enderecoCep', 'enderecoLogradouro', 'numero', 'enderecoBairro', 'enderecoCidade', 'produtos'];
    const s4 = ['codigoBanco', 'nomeBanco', 'tipoContaBanco', 'agencia', 'numeroConta', 'cidadeBanco'];
    const s5 = ['frenteDocumento', 'versoDocumento', 'selfie'];

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
    return [];
  }

  private validateCurrentStep(): boolean {
    const required = this.getRequiredForStep(this.steps);
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

  isInvalid(name: string) {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.loading);
  }

  // ===== Produtos (checkbox grid) =====
  get produtosSelecionadosChecked(): string[] {
    return (this.form.get('produtos')?.value as string[]) ?? [];
  }

  toggleOne(key: string, ev?: Event | boolean) {
    const isChecked = typeof ev === 'boolean' ? ev : !!(ev as any)?.target?.checked;
    const set = new Set(this.produtosSelecionadosChecked);
    isChecked ? set.add(key) : set.delete(key);
    this.form.get('produtos')?.setValue([...set], { emitEvent: false });
  }

  isChecked(key: string) {
    return this.produtosSelecionadosChecked.includes(key);
  }

  // ===== Upload (click + drag&drop) =====
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

  openPicker(ctrlName: DocCtrl, input: HTMLInputElement) {
    input.click();
  }

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
    const ctrl = this.form.get(ctrlName);
    ctrl?.setValue(file);
    ctrl?.markAsDirty();
    ctrl?.markAsTouched();
  }

  onDragOver(ctrlName: string, ev: DragEvent) {
    ev.preventDefault();
    this.dragOver[ctrlName] = true;
  }

  onDragLeave(ctrlName: string, _ev: DragEvent) {
    this.dragOver[ctrlName] = false;
  }

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
}
