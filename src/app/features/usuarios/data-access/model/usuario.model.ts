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
 * Cómo se agrupan en pantalla. «Sin rol» = se registró a mano y espera que le den uno.
 * «Jugadores» = contactos de un torneo: se gestionan en /jugadores.
 */
export type Grupo = 'sin-rol' | 'staff' | 'propietarios' | 'jugadores';

export const GRUPO_LABEL: Record<Grupo, string> = {
  'sin-rol': 'Sin rol',
  staff: 'Encordadores y supervisores',
  propietarios: 'Propietarios y administradores',
  jugadores: 'Jugadores de torneos',
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
