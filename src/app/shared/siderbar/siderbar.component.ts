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

  // estado de grupos
  groupOpen = signal({ settings: false });

  constructor() {
    // fecha grupos quando ficar mini
    effect(() => {
      if (this.mini) this.groupOpen.set({ settings: false });
    });

    // auto-expand "Configurações" quando estiver em uma rota filha
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const url = this.router.url;
      const isSettingsChild =
        url.startsWith('/configuracoes/perfil') || url.startsWith('/configuracoes/webhooks');
      if (isSettingsChild && !this.mini) {
        this.groupOpen.update(g => ({ ...g, settings: true }));
      }
    });
  }

  toggleGroup(key: 'settings') {
    if (this.mini) return;
    this.groupOpen.update(g => ({ ...g, [key]: !g[key] }));
  }

  rotaAtiva(rota: string) {
    return this.router.url.startsWith(rota) && !this.mini;
  }
}
