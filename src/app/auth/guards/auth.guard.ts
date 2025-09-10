// auth.guard.ts
import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const authGuard: CanMatchFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.token || auth.isLoggedIn()) return true;

    router.navigate(['/auth/login'], { replaceUrl: true });
    return false;
};
