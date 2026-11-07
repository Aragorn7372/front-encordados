/**
 * Crear un contacto sin conexión lo hacen dos features (Jugadores y el formulario de pedidos):
 * aquí está lo que comparten, la operación de la cola. La envía el manejador de Jugadores.
 * El servidor devuelve su `username`, que es lo que usan los pedidos (`playerName`).
 */
export const OP_CONTACTO_CREAR = 'contacto.crear';

export interface ContactoNuevo {
  name: string;
  email: string | null;
  phone: string | null;
  tournamentId: string;
}

export interface CrearContacto {
  /** Hace de username (y de id en Jugadores) hasta que el servidor dé el real. */
  tempId: string;
  request: ContactoNuevo;
}

/** Lo que devuelve el servidor al crearlo (UserResponseDto). */
export interface ContactoCreado {
  username: string;
  name: string;
  bonos: number;
}

/** Los contactos creados sin conexión, aún sin enviar, de un torneo. */
export function contactosPendientes(
  operaciones: { tipo: string; payload: unknown }[],
  tournamentId: string | null,
): CrearContacto[] {
  return operaciones
    .filter((op) => op.tipo === OP_CONTACTO_CREAR)
    .map((op) => op.payload as CrearContacto)
    .filter((c) => !tournamentId || c.request.tournamentId === tournamentId);
}
