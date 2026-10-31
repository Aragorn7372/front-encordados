import { inject } from '@angular/core';
import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../auth/store/auth.store';
import { ToastService } from '../toast/toast.service';
import { toAppError } from './app-error';

// para peticiones silenciosas y que salgan inline, por ejemplo en un autocomplete
export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);
  const toast = inject(ToastService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const appError = toAppError(err);
      // Sin sesión, un 401 es un login fallido, no una sesión caducada
      if (err.status === 401 && auth.isLoggedIn()) auth.logout('Tu sesión ha caducado');
      else if (err.status === 403) void router.navigate(['/403']);
      else if (!req.context.get(SILENT_ERRORS)) toast.error(appError.message);
      return throwError(() => appError);
    }),
  );
};
