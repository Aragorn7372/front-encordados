import { JugadorEdicionValue } from './jugador.model';

/**
 * Las escrituras de jugadores que pueden hacerse sin conexión. Crear un contacto es la
 * compartida con pedidos (`shared/models/contacto-pendiente`).
 */
export const OP_JUGADOR = {
  bonos: 'jugador.bonos',
  editar: 'jugador.editar',
  borrar: 'jugador.borrar',
} as const;

export interface BonosJugador {
  id: string;
  cantidad: number;
}

export interface EditarJugador {
  id: string;
  value: JugadorEdicionValue;
}

export interface BorrarJugador {
  id: string;
}
