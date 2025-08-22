import { Injectable, signal } from '@angular/core';
import { ToastOptions, ToastPosition, ToastType } from './toast.model';

@Injectable({ providedIn: 'root' })
export class ToastService {
    private _toasts = signal<Required<ToastOptions>[]>([]);
    readonly toasts = this._toasts.asReadonly();

    private defaults: Omit<Required<ToastOptions>, 'message' | 'id'> = {
        type: 'plain',
        position: 'bottom-left',
        icon: true,
        durationMs: 4000,
        closable: true,
        offset: 0,
    };

    show(opts: ToastOptions) {
        const id = opts.id ?? crypto.randomUUID();
        const t: Required<ToastOptions> = {
            id,
            ...this.defaults,
            ...opts,
            icon: opts.type === 'plain' ? (opts.icon ?? false) : (opts.icon ?? true),
        };
        this._toasts.update(list => [t, ...list]);
        if (t.durationMs > 0) setTimeout(() => this.close(id), t.durationMs);
        return id;
    }

    close(id: string) {
        this._toasts.update(list => list.filter(t => t.id !== id));
    }

    clear() { this._toasts.set([]); }

    error(message: string, position?: ToastPosition) {
        return this.show({ message, type: 'error', position });
    }
    info(message: string, position?: ToastPosition) {
        return this.show({ message, type: 'info', position });
    }
    success(message: string, position?: ToastPosition) {
        return this.show({ message, type: 'success', position });
    }
    warning(message: string, position?: ToastPosition) {
        return this.show({ message, type: 'warning', position });
    }
    plain(message: string, position?: ToastPosition) {
        return this.show({ message, type: 'plain', position, icon: false });
    }
}
