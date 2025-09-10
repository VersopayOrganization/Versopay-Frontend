import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';

export const SISTEMA_ROUTES: Routes = [
    {
        path: '',
        component: ShellComponent,
        children: [
            { path: '', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
            { path: 'perfil', loadComponent: () => import('./configuracoes/perfil/perfil.component').then(m => m.PerfilComponent) },
            { path: '**', redirectTo: '' }
        ]
    }
];
