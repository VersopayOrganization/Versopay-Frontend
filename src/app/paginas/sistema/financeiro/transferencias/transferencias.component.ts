import { Component, inject } from "@angular/core";
import { CardInfoUsuarioComponent } from "../../../../shared/card-info-usuario/card-info-usuario.component";
import { Coluna, TableComponent } from "../../../../shared/table/table.component";
import { SearchFiltroComponent } from "../../../../shared/search-filtro/search-filtro.component";
import { PedidosService } from "../../../../services/pedidos.service";
import { ToastService } from "../../../../shared/toast/toast.service";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { StatusPedido } from "../../../../core/enums/status-pedido.enum";

type Transferencia = {
  id: number;
  Nome: string;
  Data: string | null;
  metodoPagamento: string;
  valor: number;
  status: number;
};

@Component({
  selector: 'app-transferencias',
  imports: [CardInfoUsuarioComponent, TableComponent, SearchFiltroComponent],
  templateUrl: './transferencias.component.html',
  styleUrl: './transferencias.component.scss'
})
export class TransferenciasComponent {
  private pedidosService = inject(PedidosService);
  private toast = inject(ToastService);
  private safe = inject(DomSanitizer);

  rows: Transferencia[] = [];
  loading = false;

  page = 1;
  pageSize = 10;
  total = 0;
  busca = '';

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
    this.carregarPagina(1);
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
      const { items, total } = await this.pedidosService.list({
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
}
