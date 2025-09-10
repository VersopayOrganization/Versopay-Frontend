import { Routes } from '@angular/router';
import { ShellComponent } from '../shell/shell.component';

export const CONFIGURACOES_ROUTES: Routes = [
    {
        path: '',
        component: ShellComponent,
        children: [
             { path: '', redirectTo: 'perfil', pathMatch: 'full' },
            { path: 'perfil', loadComponent: () => import('./perfil/perfil.component').then(m => m.PerfilComponent) },
            { path: '**', redirectTo: '' }
        ]
    }
];
