import { Routes } from '@angular/router';

export const SISTEMA_ROUTES: Routes = [
    { path: '', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
    { path: 'perfil', loadComponent: () => import('./perfil/perfil.component').then(m => m.PerfilComponent) },
    { path: '**', redirectTo: '' }
];
