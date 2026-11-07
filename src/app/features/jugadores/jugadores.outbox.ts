import { ManejadorOutbox, definirManejador } from '../../core/offline/outbox';
import {
  ContactoCreado,
  CrearContacto,
  OP_CONTACTO_CREAR,
} from '../../shared/models/contacto-pendiente';
import { JugadoresApi } from './data-access/api/jugadores.api';
import {
  BonosJugador,
  BorrarJugador,
  EditarJugador,
  OP_JUGADOR,
} from './data-access/model/jugador-operacion.model';

/** Cómo se envía cada escritura de jugadores guardada en la cola. */
export const jugadoresManejadores: ManejadorOutbox[] = [
  // También la usa el formulario de pedidos («+» junto al jugador)
  definirManejador<JugadoresApi, CrearContacto, ContactoCreado>({
    tipo: OP_CONTACTO_CREAR,
    api: JugadoresApi,
    enviar: (api, { request }) => api.createContact(request),
    crea: ({ tempId }) => tempId,
    // El servidor solo devuelve el username: es lo que necesitan los pedidos de ese jugador
    idsCreados: ({ tempId }, { username }) => ({ [tempId]: username }),
  }),
  // Sumar no es idempotente: repetirlo daría los bonos dos veces
  definirManejador<JugadoresApi, BonosJugador, unknown>({
    tipo: OP_JUGADOR.bonos,
    api: JugadoresApi,
    enviar: (api, { id, cantidad }) => api.addBonos(id, cantidad),
  }),
  definirManejador<JugadoresApi, EditarJugador, unknown>({
    tipo: OP_JUGADOR.editar,
    api: JugadoresApi,
    enviar: (api, { id, value }) => api.update(id, value),
    idempotente: true,
  }),
  definirManejador<JugadoresApi, BorrarJugador, unknown>({
    tipo: OP_JUGADOR.borrar,
    api: JugadoresApi,
    enviar: (api, { id }) => api.remove(id),
    idempotente: true,
  }),
];
