import { Component, OnInit, inject } from '@angular/core';
import { CardInfoUsuarioComponent } from '../../../shared/card-info-usuario/card-info-usuario.component';
import { Coluna, TableComponent } from '../../../shared/table/table.component';
import { ToastService } from '../../../shared/toast/toast.service';
import { PedidosService } from '../../../services/pedidos.service';

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
  imports: [CardInfoUsuarioComponent, TableComponent],
  templateUrl: './pedidos.component.html',
  styleUrls: ['./pedidos.component.scss'],
})
export class PedidosComponent implements OnInit {
  private pedidosService = inject(PedidosService);
  private toast = inject(ToastService);

  rows: Pedido[] = [];
  loading = false;
  page = 1;
  pageSize = 10;
  total = 0;
  filtroStatus: FiltroStatus = 'todos';
  busca = '';

  columns: Coluna<Pedido>[] = [
    { key: 'id', header: 'Pedido', width: '120px', align: 'center' },
    {
      key: 'criacaoBr',
      header: 'Data',
      width: '140px',
      formatter: (v) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—'),
      align: 'center'
    },
    { key: 'metodoPagamento', header: 'Método', width: '120px', align: 'center' },
    { key: 'valor', header: 'Valor Líquido', align: 'center', formatter: v => this.moeda(v) },
    { key: 'produto', header: 'Produto', align: 'center' },
    { key: 'vendedorNome', header: 'Cliente', align: 'center' },
    { key: 'status', header: 'Status', width: '140px', formatter: v => this.badgeStatus(v), align: 'center' },
  ];

  ngOnInit() {
    this.carregarPagina(1);
  }

  loadPage(ev: number | { pageIndex: number; pageSize?: number }) {
    const nextPage = typeof ev === 'number' ? ev : ev.pageIndex;
    if (typeof ev !== 'number' && ev.pageSize && ev.pageSize !== this.pageSize) {
      this.pageSize = ev.pageSize;
    }
    this.carregarPagina(nextPage);
  }

  /** Abas: todos / pagos / pendentes */
  setFiltroStatus(s: FiltroStatus) {
    if (this.filtroStatus === s) return;
    this.filtroStatus = s;
    this.carregarPagina(1);
  }

  /** (quando ligar o search do header) */
  onSearch(term: string) {
    this.busca = term ?? '';
    this.carregarPagina(1);
  }

  /** Converte filtro da UI no que a API espera */
  private mapStatusToApi(): string | undefined {
    // back: 1 = Pago, 0 = Pendente (ajuste se diferente)
    if (this.filtroStatus === 'pagos') return '1';
    if (this.filtroStatus === 'pendentes') return '0';
    return undefined;
  }

  /** Chamada real ao backend */
  async carregarPagina(pagina: number) {
    this.loading = true;
    this.page = pagina;

    try {
      const { items, total } = await this.pedidosService.list({
        page: this.page,
        pageSize: this.pageSize,
        status: this.mapStatusToApi(),
        // vendedorId, metodo, dataDeUtc, dataAteUtc: adicionar quando os filtros existirem
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

  // ===== helpers =====
  moeda(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
  }

  badgeStatus(s: number): string {
    const isPago = s === 1;
    const cor = isPago ? '#2ecc71' : '#f1c40f';
    const txt = isPago ? 'Pago' : 'Pendente';
    return `
      <span style="display:inline-flex;gap:8px;align-items:center;">
        <i style="width:8px;height:8px;border-radius:50%;background:${cor};display:inline-block"></i>
        ${txt}
      </span>`;
  }
}
