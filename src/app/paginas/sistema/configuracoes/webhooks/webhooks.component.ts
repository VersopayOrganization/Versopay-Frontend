import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../auth/auth.service';
import { WebhooksService } from '../../../../services/webhooks.service';
import { ToastService } from '../../../../shared/toast/toast.service';
import { WebhooksCreateDto } from '../../../../models/webhooks/webhooks-create.dto';
import { WebhooksResponseDto } from '../../../../models/webhooks/webhooks-response.dto';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-webhooks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './webhooks.component.html',
  styleUrl: './webhooks.component.scss'
})
export class WebhooksComponent implements OnInit {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private webhooksService = inject(WebhooksService);
  private toast = inject(ToastService);

  userName = computed(() => this.auth.user()?.name ?? 'Usuário');
  iniciaisNome = '';

  webhooks = signal<WebhooksResponseDto[]>([]);
  hasWebhooks = computed(() => this.webhooks().length > 0);

  loading = false;
  showListaWebhooks = false;
  saving = false;

  form = this.fb.group({
    url: [
      '',
      [
        Validators.required,
      ],
    ],
    eventos: this.fb.control<string[]>([], [this.minArrayLength(1)])
  });

  readonly EVENTS = [
    { key: 'boletoGerado', label: 'Boleto Gerado' },
    { key: 'estorno', label: 'Estorno' },
    { key: 'pixGerado', label: 'Pix Gerado' },
    { key: 'carrinhoAbandonado', label: 'Carrinho Abandonado' },
    { key: 'compraAprovada', label: 'Compra Aprovada' },
    { key: 'chargeback', label: 'Chargeback' },
    { key: 'compraRecusada', label: 'Compra Recusada' },
    { key: 'processando', label: 'Processando' },
  ];

  get selectedEvents(): string[] {
    return (this.form.get('eventos')?.value as string[]) ?? [];
  }
  get allSelected(): boolean { return this.selectedEvents.length === this.EVENTS.length; }
  get someSelected(): boolean { return this.selectedEvents.length > 0 && !this.allSelected; }

  ngOnInit(): void {
    const parts = (this.userName() || '').split(' ').filter(Boolean);
    const p1 = parts[0]?.[0] ?? '';
    const p2 = parts[1]?.[0] ?? '';
    this.iniciaisNome = (p1 + p2 || p1 || '?').toUpperCase();

    this.obterWebhooks();
    this.setupUrlNormalizer();
  }

  private setupUrlNormalizer() {
    const urlCtrl = this.form.get('url')!;
    urlCtrl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe(v => {
        if (!v) return;
        const trimmed = v.trim();

        if (/^[a-zA-Z][\w+.-]*:\/\//.test(trimmed)) return;

        if (/^\/\//.test(trimmed)) {
          urlCtrl.setValue(`https:${trimmed}`, { emitEvent: false });
          return;
        }

        if (/\./.test(trimmed)) {
          urlCtrl.setValue(`https://${trimmed}`, { emitEvent: false });
        }
      });
  }

  private minArrayLength(min: number) {
    return (ctrl: AbstractControl) => {
      const v = (ctrl.value ?? []) as any[];
      return v.length >= min ? null : { minArray: { required: min, actual: v.length } };
    };
  }


  async obterWebhooks() {
    this.loading = true;
    try {
      const items = await this.webhooksService.getAll();
      this.webhooks.set(items ?? []);
    } catch (e: any) {
      this.toast.show({
        message: e?.message ?? 'Falha ao carregar webhooks.',
        type: 'error', position: 'top-right', offset: { x: 40, y: 40 }
      });
    } finally {
      this.loading = false;
    }
  }

  onBtnCadastrarWebhook() {
    this.showListaWebhooks = !this.showListaWebhooks;
    if (this.showListaWebhooks) {
      this.form.reset();
    }
  }

  async onSubmitCreate() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue() as WebhooksCreateDto;

    this.saving = true;
    try {
      const created = await this.webhooksService.create(payload);
      this.webhooks.update(list => [created, ...list]);
      this.toast.show({
        message: 'Webhook criado com sucesso!',
        type: 'success', position: 'top-right', offset: { x: 40, y: 40 }
      });
      this.showListaWebhooks = false;
    } catch (e: any) {
      this.toast.show({
        message: e?.message ?? 'Falha ao criar webhook.',
        type: 'error', position: 'top-right', offset: { x: 40, y: 40 }
      });
    } finally {
      this.saving = false;
    }
  }

  async atualizarWebhook(id: number, payload: WebhooksCreateDto) {
    this.saving = true;
    try {
      const updated = await this.webhooksService.update(id, payload);
      this.webhooks.update(list => list.map(w => (w.id === updated.id ? updated : w)));
      this.toast.show({
        message: 'Webhook atualizado!',
        type: 'success', position: 'top-right', offset: { x: 40, y: 40 }
      });
    } catch (e: any) {
      this.toast.show({
        message: e?.message ?? 'Falha ao atualizar webhook.',
        type: 'error', position: 'top-right', offset: { x: 40, y: 40 }
      });
    } finally {
      this.saving = false;
    }
  }

  isInvalid(name: string) {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.saving);
  }

  urlError() {
    const c = this.form.get('url');
    if (!c || !c.errors) return '';
    if (c.errors['required']) return 'Informe a URL.';
    if (c.errors['pattern']) return 'Use uma URL válida (http/https).';
    return 'Valor inválido.';
  }

  toggleOne(key: string, checked?: any) {
    if(checked === undefined) checked = !this.isChecked(key);

    const set = new Set(this.selectedEvents);
    checked ? set.add(key) : set.delete(key);
    this.form.get('eventos')?.setValue([...set]);
  }

  isChecked(key: string) {
    return this.selectedEvents.includes(key);
  }

  toggleAll() {
    if (this.allSelected) {
      this.form.get('eventos')?.setValue([]);
    } else {
      this.form.get('eventos')?.setValue(this.EVENTS.map(e => e.key));
    }
  }
}
