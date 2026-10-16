import { inject } from '@angular/core';
import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../toast/toast.service';
import { toAppError } from './app-error';

// para peticiones silenciosas y que salgan inline, por ejemplo en un autocomplete
export const SILENT_ERRORS = new HttpContextToken(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const appError = toAppError(err);
      // TODO: auth store aun no existe no se puede desloguear.
      if (err.status === 403) router.navigate(['/403']);
      else if (!req.context.get(SILENT_ERRORS)) toast.error(appError.message);
      return throwError(() => appError);
    }),
  );
};
