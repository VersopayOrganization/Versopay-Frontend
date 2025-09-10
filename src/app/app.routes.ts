import { Routes } from '@angular/router';
import { guestGuard } from './auth/guards/guest.guard';
import { authGuard } from './auth/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  {
    path: 'auth',
    canMatch: [guestGuard],
    loadChildren: () => import('./paginas/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'sistema',
    canMatch: [authGuard],
    loadChildren: () => import('./paginas/sistema/sistema.routes').then(m => m.SISTEMA_ROUTES)
  },
  { path: '**', redirectTo: 'auth/login' },
];
