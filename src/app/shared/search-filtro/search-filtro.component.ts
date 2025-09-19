import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-search-filtro',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './search-filtro.component.html',
  styleUrl: './search-filtro.component.scss'
})
export class SearchFiltroComponent {
  @Input() placeholder = 'Buscar...';
  @Input() debounce = 250;
  @Input() showBtnFiltrar = false;

  @Output() search = new EventEmitter<string>();
  @Output() openFilters = new EventEmitter<void>();

  form = new FormControl<string>('');

  ngOnInit() {
    this.form.valueChanges.pipe(debounceTime(this.debounce))
      .subscribe(v => this.search.emit((v ?? '').trim()));
  }
}
