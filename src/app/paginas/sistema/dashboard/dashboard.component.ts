import { AfterViewInit, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements AfterViewInit {
    private mock = inject(MockDashService);
    private auth = inject(AuthService);

    @ViewChild('chartCanvas') chartEl!: ElementRef<HTMLCanvasElement>;
    chart!: Chart;

    // sidebar
    mini = false;

    // user
    userName = computed(() => this.auth.user()?.name ?? 'Usuário');

    // state
    hideAmounts = signal<boolean>(localStorage.getItem('vp_hide_amounts') === '1');
    range: RangeKey = '7d';
    from = subDays(startOfToday(), 6);
    to = startOfToday();

    // data
    kpis = this.mock.getKpis(this.from, this.to);
    series: SeriesPoint[] = this.mock.getSeries(this.from, this.to);

    ngAfterViewInit() {
        this.buildChart();
    }

    toggleMini() { this.mini = !this.mini; }

    toggleHide() {
        const v = !this.hideAmounts();
        this.hideAmounts.set(v);
        localStorage.setItem('vp_hide_amounts', v ? '1' : '0');
    }

    setQuickRange(key: RangeKey) {
        this.range = key;
        const today = startOfToday();
        const map: Record<Exclude<RangeKey, 'custom'>, number> = { today: 0, yesterday: 1, '7d': 6, '15d': 14, '30d': 29 };
        if (key === 'custom') return;
        const back = map[key];
        this.from = subDays(today, back);
        this.to = key === 'yesterday' ? subDays(today, 1) : today;
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
        this.updateChart();
    }

    private buildChart() {
        const ctx = this.chartEl.nativeElement.getContext('2d')!;
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.series.map(p => p.x),
                datasets: [{
                    label: 'Faturamento',
                    data: this.series.map(p => p.y),
                    fill: true,
                    tension: .35
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                interaction: { mode: 'index', intersect: false },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    private updateChart() {
        this.chart.data.labels = this.series.map(p => p.x);
        (this.chart.data.datasets[0].data as number[]) = this.series.map(p => p.y);
        this.chart.update();
    }

    mask(v: number) {
        return this.hideAmounts() ? '••••••' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    dateFmt(d: Date) { return format(d, 'yyyy-MM-dd'); } // para input[type=date]
}
