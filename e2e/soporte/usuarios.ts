import fs from 'node:fs';

/**
 * Usuarios del seed del backend (UserDbContext). Son datos de desarrollo públicos: en producción
 * no existirán (ENCUERDATU-84, seeds solo con Seed__Enabled).
 */
export const USUARIOS = {
  admin: { username: 'admin_encordados', password: 'admin123', home: '/pedidos' },
  owner: { username: 'owner_principal', password: 'owner123', home: '/pedidos' },
  encordador: { username: 'carlos_encordador', password: 'encorder123', home: '/mis-asignados' },
  supervisor: { username: 'supervisor_luis', password: 'supervisor123', home: '/informes' },
  jugador: { username: 'jugador_juan', password: 'user123', home: '/mis-pedidos' },
} as const;

export type Rol = keyof typeof USUARIOS;

/**
 * Torneo propio de cada ejecución: lo crea sesiones.setup.ts (con carlos_encordador de
 * encordador) y lo borra limpieza.teardown.ts. Así los e2e no ensucian los torneos que ya hay:
 * el backend no deja borrar pedidos, solo cancelarlos.
 */
export const FICHERO_TORNEO = 'e2e/.sesiones/torneo.json';

export function torneoPruebas(): { id: string; nombre: string } {
  return JSON.parse(fs.readFileSync(FICHERO_TORNEO, 'utf8'));
}

/** Sesión guardada de cada rol (la crea sesiones.setup.ts antes de los tests). */
export const sesion = (rol: Rol) => `e2e/.sesiones/${rol}.json`;
