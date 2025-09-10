import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const guestGuard: CanMatchFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.token) {
        router.navigate(['/sistema'], { replaceUrl: true });
        return false;
    }

    return true;
};
