import { Component, Input, computed, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { LoadingService } from './loading.service';

@Component({
    standalone: true,
    selector: 'vp-loading',
    imports: [],
    template: `
    @if (showComputed()) {
      <div class="vp-loading" role="status" aria-live="polite" aria-busy="true">
        <img [src]="logoSrc" alt="Carregando" class="vp-spinner" />
      </div>
    }
  `,
    styles: [`
    .vp-loading{
      position: fixed; inset: 0; display:grid; place-items:center;
      background: rgb(0 0 0 / 70%); z-index: 9999; pointer-events: all;
    }
    .vp-spinner{
      width: 140px; height: 140px; animation: vp-bounce 1.2s ease-in-out infinite;
      user-select: none; pointer-events: none;
    }
    @keyframes vp-bounce{
      0%,100% { transform: scale(1);   opacity:.9; }
      50%     { transform: scale(1.15); opacity:1; }
    }
  `]
})
export class LoadingOverlayComponent {
    private svc = inject(LoadingService);

    @Input() show: boolean | null = null;
    @Input() logoSrc = 'assets/icons/logo-verso.svg';

    showComputed = computed(() => this.show ?? this.svc.visible());
}