export type ToastType = 'error' | 'info' | 'success' | 'success-email' | 'warning' | 'plain';

export type ToastPosition =
    | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    | 'top-center' | 'bottom-center';

export interface ToastOffset { x?: number; y?: number; }

export interface ToastOptions {
    id?: string;
    type?: ToastType;
    message: string;
    position?: ToastPosition;
    icon?: boolean;          // default: true (não mostra no 'plain')
    durationMs?: number;     // default: 4000 (0 = não fecha)
    closable?: boolean;      // default: true
    offset?: number | ToastOffset;
}
