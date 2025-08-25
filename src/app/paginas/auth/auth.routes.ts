import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  { path: 'login', loadComponent: () => import('./login/login.component').then(c => c.LoginComponent) },
  { path: 'cadastrar', loadComponent: () => import('./cadastrar/cadastrar.component').then(c => c.CadastrarComponent) },
  { path: '**', redirectTo: 'login' }
];