import { ManejadorOutbox, definirManejador } from '../../core/offline/outbox';
import { CordajesApi } from './data-access/api/cordajes.api';
import {
  BorrarCordaje,
  EditarCordaje,
  OP_CORDAJE,
} from './data-access/model/cordaje-operacion.model';
import { Cordaje } from './data-access/model/cordaje.model';

/** Cómo se envía cada escritura de cordajes guardada en la cola. Las dos se pueden repetir. */
export const cordajesManejadores: ManejadorOutbox[] = [
  definirManejador<CordajesApi, EditarCordaje, Cordaje>({
    tipo: OP_CORDAJE.editar,
    api: CordajesApi,
    enviar: (api, { id, value }) => api.update(id, value),
    idempotente: true,
  }),
  definirManejador<CordajesApi, BorrarCordaje, unknown>({
    tipo: OP_CORDAJE.borrar,
    api: CordajesApi,
    enviar: (api, { id }) => api.remove(id),
    idempotente: true,
  }),
];
