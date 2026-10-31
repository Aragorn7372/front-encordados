import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Role } from '../../../shared/models/roles';
import { AuthStore } from '../store/auth.store';
import { homeFor } from './role-home';

/** Sin sesión lleva al login recordando a dónde iba el usuario. */
export const authGuard: CanMatchFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;

  const returnUrl = router.currentNavigation()?.initialUrl.toString();
  const queryParams = returnUrl && returnUrl !== '/' ? { returnUrl } : {};
  return router.createUrlTree(['/login'], { queryParams });
};

/** Para login y registro: con sesión abierta no tienen sentido. */
export const guestGuard: CanMatchFn = () => {
  const role = inject(AuthStore).role();
  return role ? inject(Router).createUrlTree([homeFor(role)]) : true;
};

/** Lee los roles de `data.roles`. canMatch evita además descargar el código de la página. */
export const roleGuard: CanMatchFn = (route) => {
  const auth = inject(AuthStore);
  const allowed = (route.data?.['roles'] ?? []) as Role[];
  return auth.hasRole(...allowed) ? true : inject(Router).createUrlTree(['/403']);
};
