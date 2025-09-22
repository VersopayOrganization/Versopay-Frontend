import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class Utils {
  constructor(private router: Router) { }

  navegarPagina(rota: string) {
    this.router.navigateByUrl(rota);
  }

  maskCpfCnpj(value?: string | null): string {
    const d = this.onlyDigits(value);
    return d.length <= 11 ? this.maskCpf(d) : this.maskCnpj(d);
  }

  maskCep(value?: string | null): string {
    const d = this.onlyDigits(value).slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  }

  onlyDigits(v?: string | null) { return (v ?? '').replace(/\D/g, ''); }

  maskTelefone(value?: string | null): string {
    const d = this.onlyDigits(value).slice(0, 11);
    const ddd = d.slice(0, 2);
    const n1 = d.length > 10 ? d.slice(2, 7) : d.slice(2, 6);
    const n2 = d.length > 10 ? d.slice(7, 11) : d.slice(6, 10);

    let out = '';
    if (ddd) out = `(${ddd}`;
    if (ddd && (n1 || n2)) out += ') ';
    if (n1) out += n1;
    if (n2) out += `-${n2}`;
    return out;
  }

  telefoneValidator(): ValidatorFn {
    return (ctrl: AbstractControl): ValidationErrors | null => {
      const digits = this.onlyDigits(ctrl.value);
      return digits.length === 10 || digits.length === 11 ? null : { telefone: true };
    };
  }

  maskCpf(value: string): string {
    const d = this.onlyDigits(value).slice(0, 11);
    const p1 = d.slice(0, 3);
    const p2 = d.slice(3, 6);
    const p3 = d.slice(6, 9);
    const p4 = d.slice(9, 11);
    let out = p1;
    if (p2) out += `.${p2}`;
    if (p3) out += `.${p3}`;
    if (p4) out += `-${p4}`;
    return out;
  }

  maskCnpj(value: string): string {
    const d = this.onlyDigits(value).slice(0, 14);
    const p1 = d.slice(0, 2);
    const p2 = d.slice(2, 5);
    const p3 = d.slice(5, 8);
    const p4 = d.slice(8, 12);
    const p5 = d.slice(12, 14);
    let out = p1;
    if (p2) out += `.${p2}`;
    if (p3) out += `.${p3}`;
    if (p4) out += `/${p4}`;
    if (p5) out += `-${p5}`;
    return out;
  }

  minArrayLength(min: number) {
    return (ctrl: AbstractControl) => {
      const v = (ctrl.value ?? []) as any[];
      return v.length >= min ? null : { minArray: { required: min, actual: v.length } };
    };
  }

  normalizeUrl(raw?: string | null): string {
    const v = (raw ?? '').trim();
    if (!v) return '';
    if (/^[a-zA-Z][\w+.-]*:\/\//.test(v)) return v;
    if (/^\/\//.test(v)) return `https:${v}`;
    return `https://${v}`;
  }

  /** Formata número como BRL (aceita centavos). */
  formatBRL(v?: number | null) {
    const n = Number(v ?? 0);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  }

  iniciaisNomeUsuario(fullName?: string | null) {
    const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
    const p1 = parts[0]?.[0] ?? '';
    const p2 = parts[1]?.[0] ?? '';
    return (p1 + p2 || p1 || '?').toUpperCase();
  }

  /** Remove arroba e espaços extras de @handle. */
  sanitizeInstagram(raw?: string | null) {
    return (raw ?? '').toString().trim().replace(/^@/, '');
  }

  toUF(v?: string | null) {
    const s = (v ?? '').toString().trim().toUpperCase();
    return s.slice(0, 2);
  }
}
