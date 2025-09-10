import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
    const token = inject(AuthService).token;
    if (!token) return next(req);
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
}