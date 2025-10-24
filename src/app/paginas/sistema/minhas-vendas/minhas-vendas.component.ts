import { Component, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { debounceTime, distinctUntilChanged } from "rxjs";
import { CardInfoUsuarioComponent } from "../../../shared/card-info-usuario/card-info-usuario.component";
import { Coluna, TableComponent } from "../../../shared/table/table.component";
import { SearchFiltroComponent } from "../../../shared/search-filtro/search-filtro.component";
import { MinhasVendasService } from "../../../services/transferencia.service";
import { ToastService } from "../../../shared/toast/toast.service";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { StatusPedido } from "../../../core/enums/status-pedido.enum";

type Transferencia = {
  id: number;
  Nome: string;
  Data: string | null;
  metodoPagamento: string;
  valor: number;
  status: number;
};

@Component({
  selector: 'app-minhas-vendas',
  imports: [CardInfoUsuarioComponent, TableComponent, SearchFiltroComponent, ReactiveFormsModule],
  templateUrl: './minhas-vendas.component.html',
  styleUrl: './minhas-vendas.component.scss'
})
export class MinhasVendasComponent {
  private MinhasVendasService = inject(MinhasVendasService);
  private toast = inject(ToastService);
  private safe = inject(DomSanitizer);
  private fb = inject(FormBuilder);

  rows: Transferencia[] = [];
  loading = false;

  page = 1;
  pageSize = 10;
  total = 0;
  busca = '';

  saqueForm = this.fb.group({
    valor: this.fb.control<string>(''),
    metodo: this.fb.control<string>(''),
  });

  private valorCentavos = 0;
  get metodo() { return this.saqueForm.get('metodo')?.value || ''; }
  get canSubmit() { return this.valorCentavos > 0 && !!this.metodo && !this.loading; }

  private readonly STATUS_META: Record<number, { label: string; color: string }> = {
    [StatusPedido.Pendente]: { label: 'Pendente', color: '#f39c12' },
    [StatusPedido.Recusado]: { label: 'Recusado', color: '#e74c3c' },
    [StatusPedido.Concluido]: { label: 'Concluído', color: '#3498db' },
  };

  colunas: Coluna<Transferencia>[] = [
    {
      key: 'id',
      header: 'Código',
      width: '120px',
      align: 'center',
      headerAlign: 'center',
      formatter: (v) => `#${v}`,
    },
    {
      key: 'nome',
      header: 'Nome',
      align: 'center',
      headerAlign: 'center',
    },
    {
      key: 'criacaoBr',
      header: 'Data',
      width: '140px',
      align: 'center',
      headerAlign: 'center',
      formatter: (v) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—'),
    },
    {
      key: 'metodoPagamento',
      header: 'Método',
      width: '120px',
      align: 'center',
      headerAlign: 'center',
      formatter: (v) => this.ajustarNomeCartao(v),
    },
    {
      key: 'status',
      header: 'Status',
      width: '160px',
      align: 'center',
      headerAlign: 'center',
      formatter: (v) => this.renderStatusBadge(v),
    },
    {
      key: 'valor',
      header: 'Valor Líquido',
      align: 'center',
      headerAlign: 'center',
      formatter: (v) => this.moeda(v),
    }
  ];

  ngOnInit() {
    // this.carregarPagina(1);

    const ctrl = this.saqueForm.get('valor')!;
    ctrl.valueChanges.pipe(distinctUntilChanged(), debounceTime(0)).subscribe(v => {
      const digits = (v || '').toString().replace(/\D/g, '');
      this.valorCentavos = Number(digits || '0');

      const format = (this.valorCentavos / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      });

      const masked = `R$ ${format}`;
      if (masked !== v) ctrl.setValue(masked, { emitEvent: false });
    });
  }

  onSearch(term: string) {
    this.busca = term ?? '';
    this.carregarPagina(1);
  }
  onOpenFilters() {
    this.toast.show({
      message: 'Filtro avançado em breve 😉',
      type: 'info',
      position: 'top-right',
      offset: { x: 40, y: 40 },
    });
  }

  loadPage(ev: number | { pageIndex: number; pageSize?: number }) {
    const nextPage = typeof ev === 'number' ? ev : ev.pageIndex;
    if (typeof ev !== 'number' && ev.pageSize && ev.pageSize !== this.pageSize) {
      this.pageSize = ev.pageSize;
    }
    this.carregarPagina(nextPage);
  }

  async carregarPagina(pagina: number) {
    this.loading = true;
    this.page = pagina;

    try {
      const { items, total } = await this.MinhasVendasService.list({
        page: this.page,
        pageSize: this.pageSize
      });

      this.rows = (items ?? []) as unknown as Transferencia[];
      this.total = total ?? 0;
    } catch (e: any) {
      this.rows = [];
      this.total = 0;
      this.toast.show({
        message: e?.message || 'Falha ao carregar pedidos.',
        type: 'error',
        position: 'top-right',
        offset: { x: 40, y: 40 },
      });
    } finally {
      this.loading = false;
    }
  }

  private ajustarNomeCartao(v: string) {
    if (!v) return '—';
    const s = String(v).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    return s === 'cartao' ? 'Cartão' : v;
  }

  private moeda(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
  }

  private renderStatusBadge(code: number): SafeHtml {
    const meta = this.STATUS_META[Number(code)] ?? { label: String(code), color: '#bdc3c7' };
    const html = `
      <span style="display:inline-flex;gap:8px;align-items:center;">
        <i style="width:8px;height:8px;border-radius:50%;background:${meta.color};display:inline-block"></i>
        ${meta.label}
      </span>`;
    return this.safe.bypassSecurityTrustHtml(html);
  }

  setMetodo(m: 'Pix' | 'BTC' | 'USDT' | 'TED', ev?: Event | boolean) {
    const isChecked = typeof ev === 'boolean' ? ev : !!(ev as any)?.target?.checked;

    if (isChecked) {
      this.saqueForm.get('metodo')?.setValue(m);
    } else if (this.metodo === m) {
      this.saqueForm.get('metodo')?.setValue('');
    }
  }

  async solicitarSaque() {
    if (!this.canSubmit) return;

    try {
      this.loading = true;

      // Aqui você chama seu endpoint de saque quando existir.
      // Exemplo (ajuste para o seu service):
      // await this.MinhasVendasService.solicitarSaque({
      //   valorCentavos: this.valorCentavos,
      //   metodo: this.metodo
      // });

      this.toast.show({
        message: `Solicitação enviada: ${this.metodo} • ${this.moeda(this.valorCentavos / 100)}`,
        type: 'success', position: 'top-right', offset: { x: 40, y: 40 }
      });

      // reset suave
      this.saqueForm.patchValue({ valor: '', metodo: '' });
      this.valorCentavos = 0;
    } catch (e: any) {
      this.toast.show({
        message: e?.message || 'Falha ao solicitar saque.',
        type: 'error', position: 'top-right', offset: { x: 40, y: 40 }
      });
    } finally {
      this.loading = false;
    }
  }
}
