import { Component, EventEmitter, Input, Output, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './siderbar.component.html',
  styleUrls: ['./siderbar.component.scss'],
})
export class SidebarComponent {
  @Input() mini = false;
  @Output() toggle = new EventEmitter<void>();

  private router = inject(Router);

  grupoAberto = signal({ financeiro: false, configuracoes: false });

  constructor() {
    effect(() => {
      if (this.mini) this.grupoAberto.set({ financeiro: false, configuracoes: false });
    });

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const url = this.router.url;

      const isConfiguracoesFilho =
        url.startsWith('/configuracoes/perfil') || url.startsWith('/configuracoes/webhooks');

      const isFinanceiroFilho =
        url.startsWith('/sistema/financeiro') || url.startsWith('/financeiro');

      this.grupoAberto.update(g => ({
        ...g,
        configuracoes: !this.mini && (g.configuracoes || isConfiguracoesFilho),
        financeiro: !this.mini && (g.financeiro || isFinanceiroFilho),
      }));
    });
  }

  toggleGroup(key: 'financeiro' | 'configuracoes') {
    if (this.mini) return;
    this.grupoAberto.update(g => ({ ...g, [key]: !g[key] }));
  }

  rotaAtiva(rota: string | string[]) {
    const url = this.router.url;
    const list = Array.isArray(rota) ? rota : [rota];
    return !this.mini && list.some(r => url.startsWith(r));
  }
}
