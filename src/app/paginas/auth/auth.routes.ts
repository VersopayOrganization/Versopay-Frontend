import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  { path: 'login', loadComponent: () => import('./login/login.component').then(c => c.LoginComponent) },
  { path: 'cadastrar', loadComponent: () => import('./cadastrar/cadastrar.component').then(c => c.CadastrarComponent) },
  { path: 'recuperar-senha', loadComponent: () => import('./recuperar-senha/recuperar-senha.component').then(c => c.RecuperarSenhaComponent) },
  { path: '**', redirectTo: 'login' }
];
