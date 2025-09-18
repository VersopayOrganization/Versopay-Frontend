import { Routes } from '@angular/router';
import { ShellComponent } from '../shell/shell.component';

export const FINANCEIRO_ROUTES: Routes = [
    {
        path: '',
        component: ShellComponent,
        children: [
            { path: '', redirectTo: 'transferencia', pathMatch: 'full' },
            { path: 'transferencias', loadComponent: () => import('./transferencias/transferencias.component').then(m => m.TransferenciasComponent) },
            { path: '**', redirectTo: '' }
        ]
    }
];
