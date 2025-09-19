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
    OnInit,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { format, startOfToday, subDays } from 'date-fns';
import Chart from 'chart.js/auto';
import { AuthService } from '../../../auth/auth.service';
import { MockDashService, SeriesPoint } from '../mock-data.service';
import { CardInfoUsuarioComponent } from '../../../shared/card-info-usuario/card-info-usuario.component';

type RangeKey = 'today' | 'yesterday' | '7d' | '15d' | '30d' | 'custom';

@Component({
    standalone: true,
    selector: 'app-dashboard',
    imports: [CommonModule, CardInfoUsuarioComponent],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements AfterViewInit, OnDestroy, OnInit {
    private platformId = inject(PLATFORM_ID);
    private isBrowser = isPlatformBrowser(this.platformId);
    private mock = inject(MockDashService);
    private auth = inject(AuthService);

    @ViewChild('chartCanvas') chartEl!: ElementRef<HTMLCanvasElement>;
    chart!: Chart;
    userName = computed(() => this.auth.user()?.nome ?? 'Usuário');
    usuarioPossuiCadastroCompleto = computed(() => this.auth.user()?.cadastroCompleto ?? false);
    iniciaisNome: string = '';
    esconderValores = signal<boolean>(false);
    intervaloDias: RangeKey = '7d';
    from = subDays(startOfToday(), 6);
    to = startOfToday();
    kpis = this.mock.getKpis(this.from, this.to);
    series: SeriesPoint[] = this.mock.getSeries(this.from, this.to);

    constructor() {
        if (this.isBrowser) this.esconderValores.set(localStorage.getItem('vp_hide_amounts') === '1');
    }

    ngOnInit(): void {
        const primeiroNome = this.userName().split(' ')[0].slice(0, 1);
        const segundoNome = this.userName().split(' ')[1].slice(0, 1)
        this.iniciaisNome = `${primeiroNome}${segundoNome}`.toUpperCase();
        console.log(this.iniciaisNome)
    }

    ngAfterViewInit() {
        if (!this.isBrowser) return;
        // dá tempo do layout aplicar altura do card
        setTimeout(() => this.buildChart(), 100);
    }

    ngOnDestroy() {
        if (this.chart) this.chart.destroy();
    }

    toggleHide() {
        const v = !this.esconderValores();
        this.esconderValores.set(v);
        if (this.isBrowser) localStorage.setItem('vp_hide_amounts', v ? '1' : '0');
    }

    setarIntervaloData(key: RangeKey) {
        this.intervaloDias = key;
        const today = startOfToday();
        const map: Record<Exclude<RangeKey, 'custom'>, number> = {
            today: 0, yesterday: 1, '7d': 6, '15d': 14, '30d': 29
        };

        if (key !== 'custom') {
            const back = map[key];
            this.from = subDays(today, back);
            this.to = key === 'yesterday' ? subDays(today, 1) : today;
        }
        this.reloadData();
    }

    onDataSelecionada() {
        this.intervaloDias = 'custom';
        if (this.from > this.to) [this.from, this.to] = [this.to, this.from];
        this.reloadData();
    }

    private reloadData() {
        this.kpis = this.mock.getKpis(this.from, this.to);
        this.series = this.mock.getSeries(this.from, this.to);
        if (this.isBrowser) this.updateChart();
    }

    /** dd/MM -> "5 set" */
    private fmtDayMonth(value: string): string {
        const [d, m] = value.split('/');
        const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        return `${parseInt(d, 10)} ${meses[+m - 1] ?? ''}`;
    }

    private padSeriesForLine(src: SeriesPoint[]): SeriesPoint[] {
        if (src.length >= 2) return src;
        if (!src.length) return src;
        const only = src[0];
        const prev = subDays(this.from, 1);
        return [
            { x: format(prev, 'dd/MM'), y: only.y },
            { x: String(only.x), y: only.y }
        ];
    }

    private getSeriesForChart() {
        const padded = this.padSeriesForLine(this.series);
        return {
            labels: padded.map(p => this.fmtDayMonth(String(p.x))),
            data: padded.map(p => p.y)
        };
    }

    private buildChart() {
        const canvas = this.chartEl?.nativeElement;
        if (!canvas) return;

        canvas.style.width = '100%';
        canvas.style.height = '100%';

        const ctx = canvas.getContext('2d')!;
        const h = canvas.parentElement?.clientHeight ?? 360;

        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgb(41, 22, 64)');
        grad.addColorStop(1, 'rgb(11, 6, 17)');

        const { labels, data } = this.getSeriesForChart();

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Faturamento',
                    data,
                    fill: true,
                    backgroundColor: grad,
                    borderColor: '#cdbff8',
                    borderWidth: 3,
                    pointBackgroundColor: '#9376f0',
                    tension: 0.35,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHitRadius: 24,
                    showLine: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: { mode: 'nearest', intersect: false, axis: 'x' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        displayColors: false,
                        callbacks: {
                            title: (items) => items[0]?.label ?? '',
                            label: (ctx) => new Intl.NumberFormat('pt-BR', {
                                style: 'currency', currency: 'BRL'
                            }).format(ctx.parsed.y ?? 0)
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { color: '#FFF', maxRotation: 0, autoSkip: true }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: {
                            color: '#FFF',
                            stepSize: 1000,
                            maxTicksLimit: 5,
                            callback: (v: any) =>
                                Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : `${v}`
                        },
                        suggestedMax: this.roundMaxToK(data),
                    }
                }
            }
        });
    }

    private updateChart() {
        if (!this.chart) { this.buildChart(); return; }
        const { labels, data } = this.getSeriesForChart();
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
        return this.esconderValores()
            ? '••••••'
            : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    dateFmt(d: Date) { return format(d, 'yyyy-MM-dd'); }

    abriDataPicker(el: HTMLInputElement | null | undefined) {
        if (!el) return;
        if (typeof (el as any).showPicker === 'function') { (el as any).showPicker(); return; }
        el.focus();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
}
