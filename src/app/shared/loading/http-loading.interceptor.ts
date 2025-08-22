import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from './loading.service';

export const httpLoadingInterceptor: HttpInterceptorFn = (req, next) => {
    if (req.headers.has('x-no-loader')) {
        const clean = req.clone({ headers: req.headers.delete('x-no-loader') });
        return next(clean);
    }

    const loader = inject(LoadingService);
    loader.show();
    return next(req).pipe(finalize(() => loader.hide()));
};