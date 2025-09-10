import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../../shared/siderbar/siderbar.component';

@Component({
    standalone: true,
    selector: 'app-shell',
    imports: [CommonModule, RouterOutlet, SidebarComponent],
    template: `
    <div class="layout">
      <app-sidebar [mini]="mini()" (toggle)="mini.set(!mini())"></app-sidebar>
      <main class="main"><router-outlet /></main>
    </div>
  `,
    styles: [`
    .layout {
      display: grid;
      grid-template-columns: auto 1fr;
      min-height: 100dvh;
      background: var(--bg);
    }
    .main {
      min-width: 0;
      padding: 24px;
    }
  `]
})
export class ShellComponent {
    mini = signal(false);
}
