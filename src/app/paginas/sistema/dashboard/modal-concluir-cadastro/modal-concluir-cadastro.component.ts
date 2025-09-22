import { Component, inject, OnInit } from '@angular/core';
import { TipoCadastro } from '../../../../core/enums/tipo-cadastro.enum';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Utils } from '../../../../shared/utils.service';
import { ToastService } from '../../../../shared/toast/toast.service';
import { HttpClient } from '@angular/common/http';
import { distinctUntilChanged, map } from 'rxjs';
import { SelectBasicoComponent } from '../../../../shared/select-basico/select-basico.component';

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
    { key: 'nutraceutico', label: 'Nútracêutico (Encapsulados, gotas, etc...)' },
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
    cidadeBanco: ['', [Validators.required]],
    chavePix: [''],
    frenteDocumento: ['', [Validators.required]],
    versoDocumento: ['', [Validators.required]],
    selfie: ['', [Validators.required]],
    cartaoCnpj: [''],
  });

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
          this.fetchCepAndAutofill(digits);
        }
      });

    cnpjCtrl.valueChanges.pipe(distinctUntilChanged())
      .subscribe(v => {
        const masked = this.utils.maskCnpj(v ?? '');
        if (masked !== cnpjCtrl.value) cnpjCtrl.setValue(masked, { emitEvent: false });
      });

    docCtrl.valueChanges.pipe(distinctUntilChanged())
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
    this.steps = 2;
  }

  private applyTipoValidators() {
    const isPJ = this.tipoCadastro === TipoCadastro.PessoaJuridica;

    const cnpj = this.form.get('cnpj')!;
    const rz = this.form.get('razaoSocial')!;

    if (isPJ) {
      cnpj.setValidators([Validators.required]);
      rz.setValidators([Validators.required]);
    } else {
      cnpj.clearValidators();
      rz.clearValidators();
    }
    cnpj.updateValueAndValidity({ emitEvent: false });
    rz.updateValueAndValidity({ emitEvent: false });
  }

  onAvancar(next: number) {
    if (!this.validateCurrentStep()) return;

    if (this.steps === 2 || this.steps === 3 || this.steps === 5)
      this.applyTipoValidators();

    this.steps = next;
  }

  onVoltar(step: number) {
    this.steps = step;
  }

  fechar() { }

  private getRequiredForStep(step: number): string[] {
    console.log('Valores:', this.form.value);
    console.log('Formulário:', this.form);

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
      if (this.tipoCadastro === TipoCadastro.PessoaJuridica) {
        base.push('cartaoCnpj');
      }
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

  toggleOne(key: string, ev?: Event | boolean) {
    const isChecked = typeof ev === 'boolean' ? ev : !!(ev as any)?.target?.checked;
    const set = new Set(this.produtosSelecionados);
    isChecked ? set.add(key) : set.delete(key);
    this.form.get('produtos')?.setValue([...set], { emitEvent: false });
  }

  isChecked(key: string) {
    return this.produtosSelecionados.includes(key);
  }
}
