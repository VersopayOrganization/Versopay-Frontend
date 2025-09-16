import { inject, Injectable } from "@angular/core";
import { environment } from "../../environment";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { WebhooksResponseDto } from "../models/webhooks/webhooks-response.dto";
import { WebhooksCreateDto } from "../models/webhooks/webhooks-create.dto";

const API_BASE = `${environment.apiUrl}/api/webhooks`;

@Injectable({ providedIn: 'root' })
export class WebhooksService {
    private http = inject(HttpClient);

    async create(payload: WebhooksCreateDto): Promise<WebhooksResponseDto> {
        try {
            const obs = this.http.post<WebhooksResponseDto>(API_BASE, payload, { withCredentials: true });
            return await firstValueFrom(obs);
        } catch (err) {
            throw this.parseHttpError(err);
        }
    }

    async getAll(): Promise<WebhooksResponseDto[]> {
        try {
            const obs = this.http.get<WebhooksResponseDto[]>(API_BASE, { withCredentials: true });
            return await firstValueFrom(obs);
        } catch (err) {
            throw this.parseHttpError(err);
        }
    }

    async getById(id: number): Promise<WebhooksResponseDto | null> {
        try {
            const obs = this.http.get<WebhooksResponseDto>(`${API_BASE}/${id}`, { withCredentials: true });
            return await firstValueFrom(obs);
        } catch (err) {
            if (err instanceof HttpErrorResponse && err.status === 404) return null;
            throw this.parseHttpError(err);
        }
    }

    async update(id: number, payload: WebhooksCreateDto): Promise<WebhooksResponseDto> {
        try {
            const obs = this.http.put<WebhooksResponseDto>(`${API_BASE}/${id}`, payload, { withCredentials: true });
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
