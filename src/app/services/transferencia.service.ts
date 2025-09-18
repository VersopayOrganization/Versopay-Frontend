import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environment';
import { TransferenciasResponseDto } from '../models/transferencias/transferencias-response.dto';
import { TransferenciasCreateDto } from '../models/transferencias/transferencias-create.dto';

const API_BASE = `${environment.apiUrl}/api/transferencias`;

export interface TransferenciaListParams {
    status?: string;
    solicitanteId?: number;
    dataInicio?: string;
    dataFim?: string;
    page: number;
    pageSize: number;
}

export interface Paginated<T> {
    items: T[];
    total: number;
}

@Injectable({ providedIn: 'root' })
export class TransferenciaService {
    private http = inject(HttpClient);

    async list(paramsIn: TransferenciaListParams): Promise<Paginated<TransferenciasResponseDto>> {
        let params = new HttpParams()
            .set('page', String(paramsIn.page))
            .set('pageSize', String(paramsIn.pageSize));

        if (paramsIn.status != null) params = params.set('status', paramsIn.status);
        if (paramsIn.solicitanteId != null) params = params.set('solicitanteId', String(paramsIn.solicitanteId));
        if (paramsIn.dataInicio) params = params.set('dataInicio', paramsIn.dataInicio);
        if (paramsIn.dataFim) params = params.set('dataFim', paramsIn.dataFim);

        try {
            const resp = await firstValueFrom(
                this.http.get<any>(API_BASE, { withCredentials: true, observe: 'response', params })
            );

            const body = resp.body;

            if (body && typeof body === 'object' && 'pedidos' in body && 'totalRegistros' in body) {
                return { items: body.pedidos ?? [], total: body.totalRegistros };
            }

            const items: TransferenciasResponseDto[] = Array.isArray(body) ? body : [];
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

    async create(payload: TransferenciasCreateDto): Promise<TransferenciasResponseDto> {
        try {
            const obs = this.http.post<TransferenciasResponseDto>(API_BASE, payload, { withCredentials: true });
            return await firstValueFrom(obs);
        } catch (err) {
            throw this.parseHttpError(err);
        }
    }

    async getById(id: number): Promise<TransferenciasResponseDto | null> {
        try {
            const obs = this.http.get<TransferenciasResponseDto>(`${API_BASE}/${id}`, { withCredentials: true });
            return await firstValueFrom(obs);
        } catch (err) {
            if (err instanceof HttpErrorResponse && err.status === 404) return null;
            throw this.parseHttpError(err);
        }
    }

    async update(id: number, payload: TransferenciasCreateDto): Promise<TransferenciasResponseDto> {
        try {
            const obs = this.http.put<TransferenciasResponseDto>(`${API_BASE}/${id}/status`, payload, {
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
