import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'vp-sidebar',
  imports: [CommonModule],
  template: `
  <aside class="sb" [class.sb--mini]="mini">
    <div class="sb__brand">
      <img src="assets/icons/logo-tela-login.svg" alt="VersoPay" />
      <button class="sb__toggle" (click)="toggle.emit()">&raquo;</button>
    </div>

    <nav class="sb__nav">
      <a class="sb__item active"><span class="i">📈</span><span class="t">Dashboard</span></a>
      <a class="sb__item"><span class="i">🧾</span><span class="t">Pedidos</span></a>
      <a class="sb__item"><span class="i">💵</span><span class="t">Financeiro</span></a>
      <a class="sb__item"><span class="i">⚙️</span><span class="t">Configurações</span></a>
    </nav>
  </aside>
  `,
  styles: [`
  .sb{width:240px;background:#0b0814;color:#cfcde3;min-height:100dvh;padding:16px;transition:width .2s}
  .sb--mini{width:72px}
  .sb__brand{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
  .sb__brand img{height:24px;filter:brightness(3)}
  .sb--mini .sb__brand img{display:none}
  .sb__toggle{background:#2a2049;color:#cfcde3;border:0;border-radius:50%;width:30px;height:30px;cursor:pointer}
  .sb__nav{display:flex;flex-direction:column;gap:6px}
  .sb__item{display:flex;align-items:center;gap:12px;padding:12px 10px;border-radius:10px;cursor:pointer;text-decoration:none;color:inherit}
  .sb__item:hover{background:#1a1230}
  .sb__item.active{background:#26194a}
  .sb--mini .t{display:none}
  .i{width:22px;text-align:center}
  `]
})
export class SidebarComponent {
  @Input() mini = false;
  @Output() toggle = new EventEmitter<void>();
}
