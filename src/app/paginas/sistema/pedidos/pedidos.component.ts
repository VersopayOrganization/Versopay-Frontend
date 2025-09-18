import { Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { CardInfoUsuarioComponent } from '../../../shared/card-info-usuario/card-info-usuario.component';
import { Coluna, TableComponent } from '../../../shared/table/table.component';
import { SearchFiltroComponent } from '../../../shared/search-filtro/search-filtro.component';

import { ToastService } from '../../../shared/toast/toast.service';
import { PedidosService } from '../../../services/pedidos.service';
import { StatusPedido } from '../../../core/enums/status-pedido.enum'; // enum no front

type Pedido = {
  id: number;
  criacaoBr: string;
  dataPagamento: string | null;
  metodoPagamento: string;
  valor: number;
  vendedorNome: string;
  produto: string;
  status: number;
};

type FiltroStatus = 'todos' | 'pagos' | 'pendentes';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CardInfoUsuarioComponent, TableComponent, SearchFiltroComponent],
  templateUrl: './pedidos.component.html',
  styleUrls: ['./pedidos.component.scss'],
})
export class PedidosComponent implements OnInit {
  private pedidosService = inject(PedidosService);
  private toast = inject(ToastService);
  private safe = inject(DomSanitizer);

  rows: Pedido[] = [];
  loading = false;

  page = 1;
  pageSize = 10;
  total = 0;

  filtroStatus: FiltroStatus = 'todos';
  busca = '';

  // Paleta/labels de status (iguais ao protótipo)
  private readonly STATUS_META: Record<number, { label: string; color: string }> = {
    [StatusPedido.Pendente]: { label: 'Pendente', color: '#f39c12' },
    [StatusPedido.Expirado]: { label: 'Expirado', color: '#95a5a6' },
    [StatusPedido.Cancelado]: { label: 'Cancelado', color: '#e74c3c' },
    [StatusPedido.Processando]: { label: 'Processando', color: '#f39c12' },
    [StatusPedido.Recusado]: { label: 'Recusado', color: '#e74c3c' },
    [StatusPedido.Autorizado]: { label: 'Autorizado', color: '#8e44ad' },
    [StatusPedido.Capturado]: { label: 'Capturado', color: '#27ae60' },
    [StatusPedido.Pago]: { label: 'Pago', color: '#2ecc71' },
    [StatusPedido.Concluido]: { label: 'Concluído', color: '#3498db' },
    [StatusPedido.Liquidado]: { label: 'Liquidado', color: '#2ecc71' },
    [StatusPedido.EstornoParcial]: { label: 'Estorno parcial', color: '#e67e22' },
    [StatusPedido.Estornado]: { label: 'Estornado', color: '#e74c3c' },
    [StatusPedido.Chargeback]: { label: 'Chargeback', color: '#e74c3c' },
  };

  // substitua sua array `colunas` por esta:
  colunas: Coluna<Pedido>[] = [
    {
      key: 'id',
      header: 'Pedido',
      width: '120px',
      align: 'center',
      headerAlign: 'center',
      formatter: (v) => `#${v}`,
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
      key: 'valor',
      header: 'Valor Líquido',
      align: 'center',
      headerAlign: 'center',
      formatter: (v) => this.moeda(v),
    },
    {
      key: 'produto',
      header: 'Produto',
      align: 'center',
      headerAlign: 'center',
    },
    {
      key: 'vendedorNome',
      header: 'Cliente',
      align: 'center',
      headerAlign: 'center',
    },
    {
      key: 'status',
      header: 'Status',
      width: '160px',
      align: 'center',
      headerAlign: 'center',
      formatter: (v) => this.renderStatusBadge(v),
    },
  ];

  ngOnInit() {
    this.carregarPagina(1);
  }

  // ===== SearchFiltro =====
  onSearch(term: string) {
    this.busca = term ?? '';
    this.carregarPagina(1);
  }
  onOpenFilters() {
    // abrir modal lateral/filtros avançados (quando existir)
    this.toast.show({
      message: 'Filtro avançado em breve 😉',
      type: 'info',
      position: 'top-right',
      offset: { x: 40, y: 40 },
    });
  }

  // ===== Abas específicas desta tela =====
  setFiltroStatus(s: FiltroStatus) {
    if (this.filtroStatus === s) return;
    this.filtroStatus = s;
    this.carregarPagina(1);
  }

  // ===== Paginação da tabela =====
  loadPage(ev: number | { pageIndex: number; pageSize?: number }) {
    const nextPage = typeof ev === 'number' ? ev : ev.pageIndex;
    if (typeof ev !== 'number' && ev.pageSize && ev.pageSize !== this.pageSize) {
      this.pageSize = ev.pageSize;
    }
    this.carregarPagina(nextPage);
  }

  // ===== Chamada real =====
  private mapStatusToApi(): string | undefined {
    // API atual aceita “Pago” e “Pendente”.
    if (this.filtroStatus === 'pagos') return 'Pago';
    if (this.filtroStatus === 'pendentes') return 'Pendente';
    return undefined;
  }

  async carregarPagina(pagina: number) {
    this.loading = true;
    this.page = pagina;

    try {
      const { items, total } = await this.pedidosService.list({
        page: this.page,
        pageSize: this.pageSize,
        status: this.mapStatusToApi(),
        // vendedorId, metodo, dataDeUtc, dataAteUtc entram aqui quando o filtro avançado estiver pronto
      });

      this.rows = (items ?? []) as unknown as Pedido[];
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

  // ===== Helpers =====
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
