import { Component, computed, inject } from '@angular/core';
import { NgFor, NgClass } from '@angular/common';
import { ToastService } from './toast.service';
import { ToastPosition } from './toast.model';

@Component({
    standalone: true,
    selector: 'vp-toasts',
    imports: [NgFor, NgClass],
    templateUrl: './toast-container.component.html',
    styleUrl: './toast-container.component.scss'
})
export class ToastContainerComponent {
    private svc = inject(ToastService);
    positions: ToastPosition[] = [
        'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center'
    ];

    byPosition = (pos: ToastPosition) =>
        computed(() => this.svc.toasts().filter(t => t.position === pos));

    slotClass(pos: ToastPosition) { return 'slot-' + pos; }

    animClass(pos: ToastPosition) {
        switch (pos) {
            case 'top-left':
            case 'bottom-left': return 'anim-left';
            case 'top-right':
            case 'bottom-right': return 'anim-right';
            case 'top-center': return 'anim-top';
            case 'bottom-center': return 'anim-bottom';
        }
    }

    close(id: string) { this.svc.close(id); }
}
