import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { CardInfoUsuarioComponent } from '../../../shared/card-info-usuario/card-info-usuario.component';
import { AuthService } from '../../../auth/auth.service';
import { WebhooksService } from '../../../services/webhooks.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { WebhooksResponseDto } from '../../../models/webhooks/webhooks-response.dto';
import { WebhooksCreateDto } from '../../../models/webhooks/webhooks-create.dto';
import { ConfirmDialogData, ModalComponent } from '../../../shared/modal/modal.component';

@Component({
  selector: 'app-webhooks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardInfoUsuarioComponent],
  templateUrl: './webhooks.component.html',
  styleUrl: './webhooks.component.scss'
})
export class WebhooksComponent implements OnInit {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private webhooksService = inject(WebhooksService);
  private toast = inject(ToastService);
  private dialog = inject(MatDialog);

  userName = computed(() => this.auth.user()?.name ?? 'Usuário');
  iniciaisNome = '';

  webhooks = signal<WebhooksResponseDto[]>([]);
  hasWebhooks = computed(() => this.webhooks().length > 0);

  loading = false;
  showListaWebhooks = false;
  idEdicao: number | null = null;

  private MAP_BACK_TO_KEY: Record<string, string> = {
    BoletoGerado: 'boletoGerado',
    PixGerado: 'pixGerado',
    CompraAprovada: 'compraAprovada',
    CompraRecusada: 'compraRecusada',
    Estorno: 'estorno',
    CarrinhoAbandonado: 'carrinhoAbandonado',
    Chargeback: 'chargeback',
    Processando: 'processando',
  };
  private MAP_KEY_TO_BACK: Record<string, string> = Object.entries(this.MAP_BACK_TO_KEY)
    .reduce((acc, [b, k]) => (acc[k] = b, acc), {} as Record<string, string>);

  private ORDER_BITS: string[] = [
    'boletoGerado',
    'pixGerado',
    'compraAprovada',
    'compraRecusada',
    'estorno',
    'carrinhoAbandonado',
    'chargeback',
    'processando',
  ];

  trackById = (_: number, w: WebhooksResponseDto) => w.id;
  isActive = (w: WebhooksResponseDto) => (w as any).ativo ?? true;

  form = this.fb.group({
    url: ['', [Validators.required]],
    eventos: this.fb.control<string[]>([], [this.minArrayLength(1)]),
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
    urlCtrl.valueChanges.pipe(debounceTime(200), distinctUntilChanged()).subscribe(v => {
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
      this.toast.show({ message: e?.message ?? 'Falha ao carregar webhooks.', type: 'error', position: 'top-right', offset: { x: 40, y: 40 } });
    } finally {
      this.loading = false;
    }
  }

  onBtnCadastrarWebhook() {
    this.showListaWebhooks = !this.showListaWebhooks;
    if (this.showListaWebhooks) {
      this.idEdicao = null;
      this.form.reset({ url: '', eventos: [] });
    }
  }

  onEdit(webhook: WebhooksResponseDto) {
    this.idEdicao = webhook.id;
    this.showListaWebhooks = true;

    let eventosKeys: string[] = (webhook as any).eventos?.map((n: string) => this.MAP_BACK_TO_KEY[n] ?? n) ?? [];

    if ((!eventosKeys || eventosKeys.length === 0) && (webhook as any).eventosMask != null) {
      const mask = Number((webhook as any).eventosMask);
      eventosKeys = this.decodeMask(mask);
    }

    this.form.reset();
    this.form.patchValue({
      url: webhook.url,
      eventos: eventosKeys
    }, { emitEvent: false });
  }

  async onSubmitCriarWebhook() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue() as WebhooksCreateDto;
    const eventosApi = (raw.eventos ?? []).map(k => this.MAP_KEY_TO_BACK[k] ?? k);
    const payload: WebhooksCreateDto = { ...raw, eventos: eventosApi };

    this.loading = true;
    try {
      if (this.idEdicao) {
        const updated = await this.webhooksService.update(this.idEdicao, payload);
        this.webhooks.update(list => list.map(w => (w.id === updated.id ? updated : w)));
        this.toast.show({ message: 'Webhook atualizado!', type: 'success', position: 'top-right', offset: { x: 40, y: 40 } });
      } else {
        const created = await this.webhooksService.create(payload);
        this.webhooks.update(list => [created, ...list]);
        this.toast.show({ message: 'Webhook criado com sucesso!', type: 'success', position: 'top-right', offset: { x: 40, y: 40 } });
      }
      this.idEdicao = null;
      this.showListaWebhooks = false;
    } catch (e: any) {
      this.toast.show({ message: e?.message ?? 'Falha ao salvar webhook.', type: 'error', position: 'top-right', offset: { x: 40, y: 40 } });
    } finally {
      this.loading = false;
    }
  }

  async onDelete(w: WebhooksResponseDto) {
    const data: ConfirmDialogData = {
      title: 'Deletar Webhook',
      info: 'Essa ação é irreversível e resultará na perda de todos os logs.',
      message: 'Deseja realmente excluir o Webhook abaixo? Clique em Confirmar para prosseguir.',
      showCancel: true,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      urlReadonly: w.url,
    };

    const ref = this.dialog.open(ModalComponent, {
      width: '580px',
      panelClass: 'vp-dialog',
      autoFocus: false,
      data
    });

    ref.afterClosed().subscribe(async (res: any) => {
      if (res === 'confirm') {
        this.loading = true;
        try {
          await this.webhooksService.delete(w.id);
          this.webhooks.update(list => list.filter(x => x.id !== w.id));
          this.toast.show({ message: 'Webhook excluído!', type: 'success', position: 'top-right', offset: { x: 40, y: 40 } });
        } catch (e: any) {
          this.toast.show({ message: e?.message ?? 'Falha ao excluir webhook.', type: 'error', position: 'top-right', offset: { x: 40, y: 40 } });
        } finally {
          this.loading = false;
        }
      }
    });
  }

  toggleOne(key: string, ev?: Event | boolean) {
    const isChecked = typeof ev === 'boolean' ? ev : !!(ev as any)?.target?.checked;
    const set = new Set(this.selectedEvents);
    isChecked ? set.add(key) : set.delete(key);
    this.form.get('eventos')?.setValue([...set], { emitEvent: false });
  }

  isChecked(key: string) {
    return this.selectedEvents.includes(key);
  }

  toggleAll() {
    this.form.get('eventos')?.setValue(
      this.allSelected ? [] : this.EVENTS.map(e => e.key),
      { emitEvent: false }
    );
  }

  private decodeMask(mask: number): string[] {
    const out: string[] = [];
    this.ORDER_BITS.forEach((k, i) => {
      if ((mask & (1 << i)) !== 0) out.push(k);
    });
    return out;
  }

  isInvalid(name: string) {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.loading);
  }
  urlError() {
    const c = this.form.get('url');
    if (!c || !c.errors) return '';
    if (c.errors['required']) return 'Informe a URL.';
    return 'Valor inválido.';
  }
}
