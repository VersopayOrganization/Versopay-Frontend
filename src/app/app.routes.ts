import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  { path: 'auth', loadChildren: () => import('./paginas/auth/auth.routes').then(m => m.AUTH_ROUTES) },
  { path: 'sistema', loadChildren: () => import('./paginas/sistema/sistema.routes').then(m => m.SISTEMA_ROUTES) },
  { path: '**', redirectTo: 'auth/login' },
];
