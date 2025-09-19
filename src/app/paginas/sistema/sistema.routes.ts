import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';

export const SISTEMA_ROUTES: Routes = [
    {
        path: '',
        component: ShellComponent,
        children: [
            { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
            { path: 'pedidos', loadComponent: () => import('./pedidos/pedidos.component').then(m => m.PedidosComponent) },
            { path: '**', redirectTo: 'dashboard' }
        ]
    }
];
