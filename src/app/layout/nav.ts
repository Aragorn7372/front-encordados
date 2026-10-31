import { Route } from '@angular/router';
import { IconName } from '../shared/ui/icon';
import { Role } from '../shared/models/roles';

export interface NavData {
  label: string;
  icon: IconName;
}

export interface NavItem extends NavData {
  path: string;
}

/** El menú sale de las rutas: lo que se ve y lo que el guard deja pasar no pueden divergir. */
export function buildNav(routes: Route[], role: Role | null): NavItem[] {
  if (!role) return [];

  return routes.flatMap((route) => {
    const nav = route.data?.['nav'] as NavData | undefined;
    const roles = route.data?.['roles'] as Role[] | undefined;
    return nav && route.path && roles?.includes(role) ? [{ ...nav, path: `/${route.path}` }] : [];
  });
}
