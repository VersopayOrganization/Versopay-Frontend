import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, TrackByFunction } from '@angular/core';

export type Coluna<T = any> = {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any, row: T) => any;
  headerAlign?: 'left' | 'center' | 'right';
};

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
})
export class TableComponent<T = any> {
  // dados
  @Input() colunas: Coluna<T>[] = [];
  @Input() data: T[] = [];
  @Input() loading = false;
  @Input() mensagemSemRegistros = 'Nenhum registro encontrado.';
  @Input() trackBy?: TrackByFunction<T>;

  // paginação
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() total = 0;
  @Output() pageChange = new EventEmitter<number>();

  @Input() maxHeight = '62vh';

  cell(row: T, key: keyof T | string): any {
    return (row as any)[key as any];
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize || 0));
  }

  get startIdx(): number {
    if (!this.total) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get endIdx(): number {
    return Math.min(this.total, this.page * this.pageSize);
  }

  get pages(): number[] {
    const total = this.totalPages;
    const span = 5;
    let start = Math.max(1, this.page - Math.floor(span / 2));
    let end = start + span - 1;
    if (end > total) {
      end = total;
      start = Math.max(1, end - span + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  goTo(p: number) {
    const next = Math.min(this.totalPages, Math.max(1, p));
    if (next !== this.page) this.pageChange.emit(next);
  }

  prev() { this.goTo(this.page - 1); }
  next() { this.goTo(this.page + 1); }

  get skeletonRows(): number[] {
    return Array.from({ length: this.pageSize }, (_, i) => i);
  }

  trackByIndex = (_: number, __: T) => _;
}
