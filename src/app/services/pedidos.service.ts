import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environment';
import { PedidosResponseDto } from '../models/pedidos/pedidos-response.dto';
import { PedidosCreateDto } from '../models/pedidos/pedidos-create.dto';

const API_BASE = `${environment.apiUrl}/api/pedidos`;

export interface PedidosListParams {
    /** use '1' para pagos, '0' para pendentes; omita para todos */
    status?: string;
    vendedorId?: number;
    metodo?: string;
    dataDeUtc?: string;   // ISO string
    dataAteUtc?: string;  // ISO string
    page: number;
    pageSize: number;
}

export interface Paginated<T> {
    items: T[];
    total: number;
}

@Injectable({ providedIn: 'root' })
export class PedidosService {
    private http = inject(HttpClient);

    /** Busca paginada; lida tanto com array puro quanto com {items,total}. */
    async list(paramsIn: PedidosListParams): Promise<Paginated<PedidosResponseDto>> {
        let params = new HttpParams()
            .set('page', String(paramsIn.page))
            .set('pageSize', String(paramsIn.pageSize));

        if (paramsIn.status != null) params = params.set('status', paramsIn.status);
        if (paramsIn.vendedorId != null) params = params.set('vendedorId', String(paramsIn.vendedorId));
        if (paramsIn.metodo) params = params.set('metodo', paramsIn.metodo);
        if (paramsIn.dataDeUtc) params = params.set('dataDeUtc', paramsIn.dataDeUtc);
        if (paramsIn.dataAteUtc) params = params.set('dataAteUtc', paramsIn.dataAteUtc);

        try {
            const resp = await firstValueFrom(
                this.http.get<any>(API_BASE, { withCredentials: true, observe: 'response', params })
            );

            const body = resp.body;

            if (body && typeof body === 'object' && 'pedidos' in body && 'totalRegistros' in body) {
                return { items: body.pedidos ?? [], total: body.totalRegistros };
            }

            const items: PedidosResponseDto[] = Array.isArray(body) ? body : [];
            const totalHeader =
                resp.headers.get('x-total-count') ||
                resp.headers.get('X-Total-Count') ||
                resp.headers.get('x-total') ||
                resp.headers.get('X-Total');
            const total = totalHeader ? Number(totalHeader) : items.length;

            return { items, total };
        } catch (err) {
            throw this.parseHttpError(err);
        }
    }

    async create(payload: PedidosCreateDto): Promise<PedidosResponseDto> {
        try {
            const obs = this.http.post<PedidosResponseDto>(API_BASE, payload, { withCredentials: true });
            return await firstValueFrom(obs);
        } catch (err) {
            throw this.parseHttpError(err);
        }
    }

    async getById(id: number): Promise<PedidosResponseDto | null> {
        try {
            const obs = this.http.get<PedidosResponseDto>(`${API_BASE}/${id}`, { withCredentials: true });
            return await firstValueFrom(obs);
        } catch (err) {
            if (err instanceof HttpErrorResponse && err.status === 404) return null;
            throw this.parseHttpError(err);
        }
    }

    async update(id: number, payload: PedidosCreateDto): Promise<PedidosResponseDto> {
        try {
            const obs = this.http.put<PedidosResponseDto>(`${API_BASE}/${id}/status`, payload, {
                withCredentials: true,
            });
            return await firstValueFrom(obs);
        } catch (err) {
            throw this.parseHttpError(err);
        }
    }

    private parseHttpError(err: unknown): Error {
        if (err instanceof HttpErrorResponse) {
            const msg =
                (err.error && (err.error.message || err.error.title)) ||
                (typeof err.error === 'string' ? err.error : null) ||
                `Erro HTTP ${err.status || 0}`;
            return new Error(msg);
        }
        return new Error('Erro inesperado ao chamar o servidor.');
    }
}
