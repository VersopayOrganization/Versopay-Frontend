import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UsuarioCreateDto } from '../models/usuarios/usuario-create.dto';
import { UsuarioResponseDto } from '../models/usuarios/usuario-response.dto';
import { environment } from '../../environment';
import { UsuarioUpdateDto } from '../models/usuarios/usuario-update.dto';

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

  async update(id: number, payload: UsuarioUpdateDto): Promise<UsuarioResponseDto> {
    try {
      const obs = this.http.put<UsuarioResponseDto>(`${API_BASE}/${id}`, payload, {
        withCredentials: true,
      });
      return await firstValueFrom(obs);
    } catch (err) {
      throw this.parseHttpError(err);
    }
  }

  async completarCadastro(
    idUsuario: any,
    payload: any
  ): Promise<UsuarioResponseDto> {
    try {

      const obs = this.http.put<UsuarioResponseDto>(
        `${API_BASE}/${idUsuario}/completar-cadastro`,
        payload,
        { withCredentials: true }
      );
      return await firstValueFrom(obs);
    } catch (err) {
      throw this.parseHttpError(err);
    }
  }

  async esqueciSenha(payload: any) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    try {
      const resp = this.http
        .post(API_BASE + '/esqueci-senha', payload, { headers, withCredentials: true })
        .toPromise();

      return await resp;
    } catch (err) {
      throw err;
    }
  }

  async reseterSenha(payload: any) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    try {
      const resp = this.http
        .post(API_BASE + '/resetar-senha', payload, { headers, withCredentials: true })
        .toPromise();

      return await resp;
    } catch (err) {
      throw err;
    }
  }

  async validarTokenResetSenha(token: string): Promise<boolean> {
    try {
      const params = new HttpParams().set('token', token);
      await firstValueFrom(
        this.http.get(`${API_BASE}/resetar-senha/validar`, { params, withCredentials: true })
      );
      return true;
    } catch {
      return false;
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


  private toFormData(obj: Record<string, any>): FormData {
    const fd = new FormData();
    const append = (key: string, value: any) => {
      if (value === undefined || value === null) return;
      if (value instanceof Blob || value instanceof File) {
        fd.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach(v => append(`${key}[]`, v));
      } else if (typeof value === 'object') {
        Object.keys(value).forEach(k => append(`${key}[${k}]`, value[k]));
      } else {
        fd.append(key, String(value));
      }
    };
    Object.keys(obj).forEach(k => append(k, obj[k]));
    return fd;
  }
}
