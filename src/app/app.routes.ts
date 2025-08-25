import { Routes } from '@angular/router';
import { homeRedirectGuard } from './core/guards/home-redirect.guard';

export const routes: Routes = [
  { path: '', canActivate: [homeRedirectGuard], children: [] },
  { path: 'auth', loadChildren: () => import('./paginas/auth/auth.routes').then(m => m.AUTH_ROUTES) },
  { path: '**', redirectTo: '' }
];