import { Role } from '../../../../shared/models/roles';

export interface Usuario {
  id: string;
  nombre: string;
  username: string | null;
  email: string | null;
  /** null si el backend trae un rol que no conocemos. */
  rol: Role | null;
  torneoId: string | null;
  imagen: string;
}

/**
 * Las pestañas de la pantalla: siempre se mira un tipo, y la búsqueda y las páginas van dentro.
 * «Sin rol» = se registró a mano y espera que le den uno. «Jugadores» = cuentas de jugador de un
 * torneo (se gestionan en /jugadores).
 */
export type Grupo = 'encordadores' | 'supervisores' | 'jugadores' | 'sin-rol' | 'propietarios';

export const GRUPO_LABEL: Record<Grupo, string> = {
  encordadores: 'Encordadores',
  supervisores: 'Supervisores',
  jugadores: 'Jugadores',
  'sin-rol': 'Sin rol',
  propietarios: 'Propietarios',
};

/** Los roles que el ADMIN puede dar a una cuenta sin rol. */
export const ROLES_ASIGNABLES: Role[] = ['ENCORDER', 'SUPERVISOR', 'OWNER', 'ADMIN'];

/** Los nombres de las entidades del manifest, en español. */
export const ENTIDAD_LABEL: Record<string, string> = {
  users: 'Usuarios',
  tournaments: 'Torneos',
  materials: 'Materiales',
  cuerdas: 'Cordajes',
  orders: 'Pedidos',
};
