import { Injectable } from '@angular/core';
import { addDays, eachDayOfInterval, format } from 'date-fns';

export type SeriesPoint = { x: string; y: number };
export type Kpis = { faturamento: number; saldoDisponivel: number; saldoPendente: number };

@Injectable({ providedIn: 'root' })
export class MockDashService {
    private seed = 123;

    private rng() {
        // LCG simples p/ dados reprodutíveis
        this.seed = (1103515245 * this.seed + 12345) % 2 ** 31;
        return (this.seed & 0x7fffffff) / 0x7fffffff;
    }

    getKpis(from: Date, to: Date): Kpis {
        const days = Math.max(1, (to.getTime() - from.getTime()) / 86_400_000);
        const base = 2000 + this.rng() * 20000;
        return {
            faturamento: base * days,
            saldoDisponivel: base * 0.85,
            saldoPendente: base * 0.15,
        };
    }

    getSeries(from: Date, to: Date): SeriesPoint[] {
        const days = eachDayOfInterval({ start: from, end: to });
        let acc = 500 + this.rng() * 1500;
        return days.map(d => {
            acc += (this.rng() - 0.4) * 600;
            if (acc < 100) acc = 100;
            return { x: format(d, 'dd/MM'), y: Math.round(acc) };
        });
    }
}
