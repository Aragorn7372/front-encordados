import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from '../auth/store/auth.store';
import { APP_CONFIG } from '../config/app-config';

/**
 * Todo lo que habla con nuestra API: URL base, Accept y token.
 * Va junto a propósito: el token solo debe salir hacia nuestro backend.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);

  const { apiUrl } = inject(APP_CONFIG);
  const token = inject(AuthStore).token();

  return next(
    req.clone({
      url: `${apiUrl}${req.url}`,
      setHeaders: {
        Accept: req.headers.get('Accept') ?? 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }),
  );
};
