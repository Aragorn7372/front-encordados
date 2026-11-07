import { inject } from '@angular/core';
import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../auth/store/auth.store';
import { ToastService } from '../toast/toast.service';
import { esSinServidor, toAppError } from './app-error';

// para peticiones silenciosas y que salgan inline, por ejemplo en un autocomplete
export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);
  const toast = inject(ToastService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const appError = toAppError(err);
      const silent = req.context.get(SILENT_ERRORS);
      // Sin sesión, un 401 es un login fallido, no una sesión caducada
      if (err.status === 401 && auth.isLoggedIn()) auth.logout('Tu sesión ha caducado');
      // Silenciosa = el componente pinta el error: un 403 en un formulario no debe sacarte de él
      else if (err.status === 403 && !silent) void router.navigate(['/403']);
      // Una lectura sin red ya la cuenta el aviso global de conexión: no un toast por petición
      else if (!silent && !(esSinServidor(err.status) && req.method === 'GET')) {
        toast.error(appError.message);
      }
      return throwError(() => appError);
    }),
  );
};
