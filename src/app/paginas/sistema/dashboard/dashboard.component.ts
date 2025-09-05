import {
    AfterViewInit,
    Component,
    ElementRef,
    ViewChild,
    computed,
    inject,
    signal,
    OnDestroy,
    PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { format, startOfToday, subDays } from 'date-fns';
import Chart from 'chart.js/auto';
import { SidebarComponent } from '../../../shared/siderbar/siderbar.component';
import { AuthService } from '../../../auth/auth.service';
import { MockDashService, SeriesPoint } from '../mock-data.service';

type RangeKey = 'today' | 'yesterday' | '7d' | '15d' | '30d' | 'custom';

@Component({
    standalone: true,
    selector: 'vp-dashboard',
    imports: [CommonModule, SidebarComponent],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
    private platformId = inject(PLATFORM_ID);
    private isBrowser = isPlatformBrowser(this.platformId);

    private mock = inject(MockDashService);
    private auth = inject(AuthService);

    @ViewChild('chartCanvas') chartEl!: ElementRef<HTMLCanvasElement>;
    chart!: Chart;

    // sidebar
    mini = false;

    // user
    userName = computed(() => this.auth.user()?.name ?? 'Usuário');

    // 👁️ visibilidade dos valores — NÃO leia localStorage direto no SSR
    hideAmounts = signal<boolean>(false);

    // range
    range: RangeKey = '7d';
    from = subDays(startOfToday(), 6);
    to = startOfToday();

    // dados
    kpis = this.mock.getKpis(this.from, this.to);
    series: SeriesPoint[] = this.mock.getSeries(this.from, this.to);

    constructor() {
        // carrega preferência do olho só no browser
        if (this.isBrowser) {
            this.hideAmounts.set(localStorage.getItem('vp_hide_amounts') === '1');
        }
    }

    ngAfterViewInit() {
        // só cria o Chart no browser (no SSR não há canvas)
        if (!this.isBrowser) return;
        // espera o layout aplicar altura do wrapper
        setTimeout(() => this.buildChart(), 0);
    }

    ngOnDestroy() {
        if (this.chart) this.chart.destroy();
    }

    toggleMini() {
        this.mini = !this.mini;
    }

    toggleHide() {
        const v = !this.hideAmounts();
        this.hideAmounts.set(v);
        if (this.isBrowser) {
            localStorage.setItem('vp_hide_amounts', v ? '1' : '0');
        }
    }

    setQuickRange(key: RangeKey) {
        this.range = key;
        const today = startOfToday();
        const map: Record<Exclude<RangeKey, 'custom'>, number> = {
            today: 0,
            yesterday: 1,
            '7d': 6,
            '15d': 14,
            '30d': 29,
        };
        if (key !== 'custom') {
            const back = map[key];
            this.from = subDays(today, back);
            this.to = key === 'yesterday' ? subDays(today, 1) : today;
        }
        this.reloadData();
    }

    onDateChange() {
        this.range = 'custom';
        if (this.from > this.to) [this.from, this.to] = [this.to, this.from];
        this.reloadData();
    }

    private reloadData() {
        this.kpis = this.mock.getKpis(this.from, this.to);
        this.series = this.mock.getSeries(this.from, this.to);
        if (this.isBrowser) this.updateChart();
    }

    private fmtDayMonth(value: any): string {
        const [day, month] = value.split('/');
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const idx = parseInt(month, 10) - 1;
        return `${day} ${meses[idx] ?? ''}`;
    }

    private buildChart() {
        const canvas = this.chartEl.nativeElement;
        const ctx = canvas.getContext('2d')!;
        const h = canvas.parentElement?.clientHeight ?? 400;

        // gradiente
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgb(41, 22, 64)');
        grad.addColorStop(1, 'rgb(11, 6, 17)');

        const labels = this.series.map(p => this.fmtDayMonth(p.x as any as Date));
        console.log('labels', labels);

        const data = this.series.map((p) => p.y);
        console.log('data', data);

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Faturamento',
                        data,
                        fill: true,
                        backgroundColor: grad,
                        borderColor: '#cdbff8',
                        borderWidth: 4,
                        pointRadius: 4,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#cdbff8',
                        tension: 0.35,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        intersect: false,
                        mode: 'index',
                        callbacks: {
                            title: (it) => String(it[0].label),
                            label: (it: any) =>
                                new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(it[0].parsed.y ?? 0),
                        },
                    },
                },
                interaction: { intersect: false, mode: 'index' },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: {
                            color: '#FFF',
                            maxRotation: 0,
                            autoSkip: true,
                            callback: function (_, idx) {
                                return String(this.getLabelForValue(idx));
                            },
                        },
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: {
                            color: '#FFF',
                            stepSize: 1000,
                            maxTicksLimit: 5,
                            callback: (v: any) =>
                                Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : `${v}`,
                        },
                        suggestedMax: this.roundMaxToK(data),
                    },
                },
            },
        });
    }

    private updateChart() {
        if (!this.chart) return;
        const labels = this.series.map((p) => p.x);
        const data = this.series.map((p) => p.y);
        this.chart.data.labels = labels;
        (this.chart.data.datasets[0].data as number[]) = data;
        (this.chart.options.scales! as any).y.suggestedMax = this.roundMaxToK(data);
        this.chart.update();
    }

    private roundMaxToK(arr: number[]) {
        const m = Math.max(...arr, 0);
        const k = Math.ceil(m / 1000) * 1000;
        return k + 500;
    }

    mask(v: number) {
        return this.hideAmounts()
            ? '••••••'
            : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    dateFmt(d: Date) {
        return format(d, 'yyyy-MM-dd');
    }
}
