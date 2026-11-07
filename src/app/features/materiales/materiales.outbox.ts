import { ManejadorOutbox, definirManejador } from '../../core/offline/outbox';
import { MaterialesApi } from './data-access/api/materiales.api';
import {
  BorrarMaterial,
  EditarMaterial,
  OP_MATERIAL,
} from './data-access/model/material-operacion.model';
import { Material } from './data-access/model/material.model';

/** Cómo se envía cada escritura de materiales guardada en la cola. Las dos se pueden repetir. */
export const materialesManejadores: ManejadorOutbox[] = [
  definirManejador<MaterialesApi, EditarMaterial, Material>({
    tipo: OP_MATERIAL.editar,
    api: MaterialesApi,
    enviar: (api, { id, value }) => api.update(id, value),
    idempotente: true,
  }),
  definirManejador<MaterialesApi, BorrarMaterial, unknown>({
    tipo: OP_MATERIAL.borrar,
    api: MaterialesApi,
    enviar: (api, { id }) => api.remove(id),
    idempotente: true,
  }),
];
