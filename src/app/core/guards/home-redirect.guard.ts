import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

export const homeRedirectGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn()
    ? router.createUrlTree(['/dashboard'])
    : router.createUrlTree(['/auth/login']);
};