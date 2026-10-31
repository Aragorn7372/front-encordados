import { TestBed } from '@angular/core/testing';
import { Route, Router, UrlTree, provideRouter } from '@angular/router';
import { Role } from '../../../shared/models/roles';
import { authGuard, guestGuard, roleGuard } from './auth.guards';
import { AuthStore } from '../store/auth.store';

describe('guards de autenticación', () => {
  const configure = (role: Role | null) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: {
            role: () => role,
            isLoggedIn: () => role !== null,
            hasRole: (...roles: Role[]) => role !== null && roles.includes(role),
          },
        },
      ],
    });
  };

  const run = (guard: typeof authGuard, route: Route = {}) =>
    TestBed.runInInjectionContext(() => guard(route, [], {} as never));

  const url = (result: unknown) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  it('authGuard deja pasar con sesión', () => {
    configure('USER');
    expect(run(authGuard)).toBe(true);
  });

  it('authGuard manda al login sin sesión', () => {
    configure(null);
    expect(url(run(authGuard))).toBe('/login');
  });

  it('guestGuard deja pasar sin sesión', () => {
    configure(null);
    expect(run(guestGuard)).toBe(true);
  });

  it('guestGuard manda a la home del rol con sesión', () => {
    configure('ENCORDER');
    expect(url(run(guestGuard))).toBe('/mis-asignados');
  });

  it('roleGuard deja pasar a un rol permitido', () => {
    configure('OWNER');
    expect(run(roleGuard, { data: { roles: ['ADMIN', 'OWNER'] } })).toBe(true);
  });

  it('roleGuard manda a /403 a un rol no permitido', () => {
    configure('USER');
    expect(url(run(roleGuard, { data: { roles: ['ADMIN', 'OWNER'] } }))).toBe('/403');
  });

  it('roleGuard no deja pasar a una ruta sin roles declarados', () => {
    configure('ADMIN');
    expect(url(run(roleGuard))).toBe('/403');
  });
});
