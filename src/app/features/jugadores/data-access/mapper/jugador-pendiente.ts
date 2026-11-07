import { sustituirIds } from '../../../../core/offline/outbox';
import { CrearContacto, OP_CONTACTO_CREAR } from '../../../../shared/models/contacto-pendiente';
import {
  BonosJugador,
  BorrarJugador,
  EditarJugador,
  OP_JUGADOR,
} from '../model/jugador-operacion.model';
import { Jugador } from '../model/jugador.model';

/** Un contacto creado sin conexión, como se verá en la lista hasta que se envíe. */
export function jugadorPendiente({ tempId, request }: CrearContacto): Jugador {
  return {
    id: tempId,
    nombre: request.name,
    username: null,
    email: request.email,
    bonos: 0,
    imagen: '',
  };
}

const cambiar = (jugadores: Jugador[], id: string, cambio: (j: Jugador) => Jugador) =>
  jugadores.map((jugador) => (jugador.id === id ? cambio(jugador) : jugador));

/**
 * Lo que se ve = lo del servidor (o su copia) + los cambios de la cola que aún no han llegado,
 * en orden. Igual que en pedidos: la copia guardada no se toca.
 */
export function aplicarPendientes(
  jugadores: Jugador[],
  operaciones: { tipo: string; payload: unknown }[],
  ids: Record<string, string>,
  tournamentId: string | null,
): Jugador[] {
  let lista = jugadores;
  for (const op of operaciones) {
    const payload = sustituirIds(op.payload, ids);
    switch (op.tipo) {
      case OP_CONTACTO_CREAR: {
        const contacto = payload as CrearContacto;
        if (tournamentId && contacto.request.tournamentId !== tournamentId) break;
        lista = [...lista, jugadorPendiente(contacto)];
        break;
      }
      case OP_JUGADOR.bonos: {
        const { id, cantidad } = payload as BonosJugador;
        lista = cambiar(lista, id, (j) => ({ ...j, bonos: j.bonos + cantidad }));
        break;
      }
      case OP_JUGADOR.editar: {
        const { id, value } = payload as EditarJugador;
        lista = cambiar(lista, id, (j) => ({
          ...j,
          nombre: value.nombre.trim() || j.nombre,
          email: value.email.trim() || j.email,
        }));
        break;
      }
      case OP_JUGADOR.borrar: {
        const { id } = payload as BorrarJugador;
        lista = lista.filter((j) => j.id !== id);
        break;
      }
    }
  }
  return lista;
}

/** A qué jugador afecta (al crear, su id temporal), para marcarlo «sin enviar». */
export function jugadorDeOperacion(op: { tipo: string; payload: unknown }): string | null {
  if (op.tipo === OP_CONTACTO_CREAR) return (op.payload as CrearContacto).tempId;
  if (Object.values<string>(OP_JUGADOR).includes(op.tipo)) return (op.payload as { id: string }).id;
  return null;
}

/** Los textos del panel de cambios pendientes. */
export const describir = {
  contacto: (nombre: string) => `Nuevo jugador: ${nombre}`,
  bonos: (jugador: Jugador, cantidad: number) => `${cantidad} € en bonos para ${jugador.nombre}`,
  editar: (jugador: Jugador) => `Editar a ${jugador.nombre}`,
  borrar: (jugador: Jugador) => `Borrar a ${jugador.nombre}`,
};
