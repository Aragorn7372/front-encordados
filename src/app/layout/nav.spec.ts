import { Route } from '@angular/router';
import { buildNav } from './nav';

describe('buildNav', () => {
  const routes: Route[] = [
    { path: 'pedidos', data: { roles: ['ADMIN'], nav: { label: 'Pedidos', icon: 'pedido' } } },
    { path: 'torneos/:id', data: { roles: ['ADMIN', 'USER'] } },
    {
      path: 'perfil',
      data: { roles: ['ADMIN', 'USER'], nav: { label: 'Perfil', icon: 'usuarios' } },
    },
  ];

  it('solo incluye las rutas con nav permitidas para el rol', () => {
    expect(buildNav(routes, 'USER')).toEqual([
      { path: '/perfil', label: 'Perfil', icon: 'usuarios' },
    ]);
  });

  it('respeta el orden de las rutas', () => {
    expect(buildNav(routes, 'ADMIN').map((item) => item.path)).toEqual(['/pedidos', '/perfil']);
  });

  it('sin rol no hay menú', () => {
    expect(buildNav(routes, null)).toEqual([]);
  });
});
