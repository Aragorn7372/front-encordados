import { Role } from './roles';

/** Dónde ve cada rol sus pedidos: ahí se abre uno escaneado o el de una notificación. */
const PEDIDOS_DE: Partial<Record<Role, string>> = {
  ADMIN: '/pedidos',
  OWNER: '/pedidos',
  ENCORDER: '/mis-asignados',
  USER: '/mis-pedidos',
};

/** null si ese rol no ve el detalle de los pedidos (SUPERVISOR). */
export function rutaPedidosDe(rol: Role | null): string | null {
  return (rol && PEDIDOS_DE[rol]) || null;
}
