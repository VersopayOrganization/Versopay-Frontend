import { Component, Input, forwardRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type SelectOption = { value: string; label: string };

@Component({
  standalone: true,
  selector: 'app-select-basico',
  imports: [CommonModule],
  templateUrl: './select-basico.component.html',
  styleUrls: ['./select-basico.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SelectBasicoComponent),
    multi: true
  }]
})
export class SelectBasicoComponent implements ControlValueAccessor {
  @Input() placeholder = 'Selecione...';
  @Input() options: SelectOption[] = [];
  @Input() disabled = false;
  @Input() width: string | null = null; // ex: '280px' opcional

  open = false;
  value: string | null = null;
  onChange = (v: any) => { };
  onTouched = () => { };

  get currentLabel() {
    return this.options.find(o => o.value === this.value)?.label ?? this.placeholder;
  }

  toggle() {
    if (this.disabled) return;
    this.open = !this.open;
    this.onTouched();
  }
  select(v: string) {
    this.value = v;
    this.onChange(v);
    this.open = false;
  }

  // CVA
  writeValue(v: any): void { this.value = v ?? null; }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  // Fecha clicando fora
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const path = ev.composedPath?.() ?? [];
    const inside = path.some((el: any) => el?.classList?.contains?.('vp-select'));
    if (!inside) this.open = false;
  }
}
