import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UsuarioCreateDto } from '../models/usuarios/usuario-create.dto';
import { UsuarioResponseDto } from '../models/usuarios/usuario-response.dto';
import { environment } from '../../environment';

const API_BASE = `${environment.apiUrl}/api/usuarios`;

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);

  async create(payload: UsuarioCreateDto): Promise<UsuarioResponseDto> {
    try {
      const obs = this.http.post<UsuarioResponseDto>(API_BASE + '/cadastro-inicial', payload, {
        withCredentials: true,
      });
      return await firstValueFrom(obs);
    } catch (err) {
      throw this.parseHttpError(err);
    }
  }

  async getAll(): Promise<UsuarioResponseDto[]> {
    try {
      const obs = this.http.get<UsuarioResponseDto[]>(API_BASE, {
        withCredentials: true,
      });
      return await firstValueFrom(obs);
    } catch (err) {
      throw this.parseHttpError(err);
    }
  }

  async getById(id: number): Promise<UsuarioResponseDto | null> {
    try {
      const obs = this.http.get<UsuarioResponseDto>(`${API_BASE}/${id}`, {
        withCredentials: true,
      });
      return await firstValueFrom(obs);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) return null;
      throw this.parseHttpError(err);
    }
  }

  async update(id: number, payload: UsuarioCreateDto): Promise<UsuarioResponseDto> {
    try {
      const obs = this.http.put<UsuarioResponseDto>(`${API_BASE}/${id}`, payload, {
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
