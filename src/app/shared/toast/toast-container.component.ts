import { Component, computed, inject } from '@angular/core';
import { NgFor, NgClass, NgStyle } from '@angular/common';
import { ToastService } from './toast.service';
import { ToastOptions, ToastPosition } from './toast.model';

@Component({
    standalone: true,
    selector: 'vp-toasts',
    imports: [NgFor, NgClass, NgStyle],
    templateUrl: './toast-container.component.html',
    styleUrl: './toast-container.component.scss'
})
export class ToastContainerComponent {
    private svc = inject(ToastService);
    private edge = 16;

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

    itemStyle(t: Required<ToastOptions>, pos: ToastPosition) {
        const off = typeof t.offset === 'number'
            ? { x: t.offset, y: t.offset }
            : (t.offset ?? {});

        const x = off.x ?? 0;
        const y = off.y ?? 0;

        switch (pos) {
            case 'top-left':
                return { 'margin-left.px': x, 'margin-top.px': y };
            case 'top-right':
                return { 'margin-right.px': x, 'margin-top.px': y };
            case 'bottom-left':
                return { 'margin-left.px': x, 'margin-bottom.px': y };
            case 'bottom-right':
                return { 'margin-right.px': x, 'margin-bottom.px': y };
            case 'top-center':
                return { 'margin-top.px': y };
            case 'bottom-center':
                return { 'margin-bottom.px': y };
        }
    }

    close(id: string) { this.svc.close(id); }
}
