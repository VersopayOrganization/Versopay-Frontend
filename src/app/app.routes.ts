import { Routes } from '@angular/router';
import { authGuard } from './auth/guards/auth.guard';
import { guestGuard } from './auth/guards/guest.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },

  {
    path: 'auth', canMatch: [guestGuard],
    loadChildren: () => import('./paginas/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'sistema', canMatch: [authGuard],
    loadChildren: () => import('./paginas/sistema/sistema.routes').then(m => m.SISTEMA_ROUTES)
  },
  {
    path: 'financeiro', canMatch: [authGuard],
    loadChildren: () => import('./paginas/sistema/financeiro/financeiro.routes').then(m => m.FINANCEIRO_ROUTES)
  },
  {
    path: 'configuracoes', canMatch: [authGuard],
    loadChildren: () => import('./paginas/sistema/configuracoes/configuracoes.routes').then(m => m.CONFIGURACOES_ROUTES)
  },

  // Redirects de compatibilidade (opcional, mas recomendado)
  { path: 'sistema/perfil', redirectTo: 'configuracoes/perfil', pathMatch: 'full' },
  { path: 'sistema/webhooks', redirectTo: 'configuracoes/webhooks', pathMatch: 'full' },
  { path: 'sistema/configuracoes', redirectTo: 'configuracoes', pathMatch: 'full' },
  { path: 'sistema/configuracoes/perfil', redirectTo: 'configuracoes/perfil', pathMatch: 'full' },
  { path: 'sistema/configuracoes/webhooks', redirectTo: 'configuracoes/webhooks', pathMatch: 'full' },

  { path: '**', redirectTo: 'auth/login' },
];
