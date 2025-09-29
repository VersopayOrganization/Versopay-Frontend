import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';

export const SISTEMA_ROUTES: Routes = [
    {
        path: '',
        component: ShellComponent,
        children: [
            { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
            { path: 'transferencias', loadComponent: () => import('./transferencias/transferencias.component').then(m => m.TransferenciasComponent) },
            { path: 'perfil', loadComponent: () => import('./perfil/perfil.component').then(m => m.PerfilComponent) },
            { path: 'webhooks', loadComponent: () => import('./webhooks/webhooks.component').then(m => m.WebhooksComponent) },
            { path: 'pedidos', loadComponent: () => import('./pedidos/pedidos.component').then(m => m.PedidosComponent) },
            { path: '**', redirectTo: 'dashboard' }
        ]
    }
];
