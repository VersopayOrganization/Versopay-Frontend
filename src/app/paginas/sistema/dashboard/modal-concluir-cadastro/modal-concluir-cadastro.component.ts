import { Component, inject, OnInit } from '@angular/core';
import { TipoCadastro } from '../../../../core/enums/tipo-cadastro.enum';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Utils } from '../../../../shared/utils.service';
import { ToastService } from '../../../../shared/toast/toast.service';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';

@Component({
  selector: 'app-modal-concluir-cadastro',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-concluir-cadastro.component.html',
  styleUrl: './modal-concluir-cadastro.component.scss'
})
export class ModalConcluirCadastroComponent implements OnInit {
  private fb = inject(FormBuilder);
  private utils = inject(Utils);
  private toast = inject(ToastService);
  private http = inject(HttpClient);
  private ultimoCepObtido: string | null = null;

  steps: number = 1;
  tipoCadastro: TipoCadastro = 0;
  loading: boolean = false;

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
    telefone: ['', [Validators.required]],
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
        const masked = this.utils.maskCpf(v ?? '');
        if (masked !== docCtrl.value) {
          docCtrl.setValue(masked, { emitEvent: false });
        }
      });
  }

  onSelectTipoCadastro(tipoCadastro: TipoCadastro) {
    this.steps = 2;
    this.tipoCadastro = tipoCadastro;
  }

  onAvancar(steps: number) {
    console.log(this.form.value)

    if (this.tipoCadastro === TipoCadastro.PessoaJuridica) {
      this.form.get('cnpj')?.setValidators([Validators.required]);
      this.form.get('razaoSocial')?.setValidators([Validators.required]);
      this.form.get('cartaoCnpj')?.setValidators([Validators.required]);
    } else {
      this.form.get('cnpj')?.clearValidators();
      this.form.get('razaoSocial')?.clearValidators();
      this.form.get('cartaoCnpj')?.clearValidators();
    }

    this.steps = steps;
  }

  onVoltar(steps: number) {
    this.steps = steps;
  }

  fechar() {

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
}
