import { ManejadorOutbox, definirManejador } from '../../core/offline/outbox';
import { PedidosApi } from './data-access/api/pedidos.api';
import { PedidoLineaDto } from './data-access/dto/pedido.dto';
import { idsCreados } from './data-access/mapper/pedido-pendiente';
import {
  CancelarLinea,
  CancelarPedido,
  CrearPedido,
  EditarPedido,
  EstadoLinea,
  OP_PEDIDO,
} from './data-access/model/pedido-operacion.model';
import { Pedido } from './data-access/model/pedido.model';

/** Cómo se envía cada escritura de pedidos guardada en la cola. */
export const pedidosManejadores: ManejadorOutbox[] = [
  definirManejador<PedidosApi, CrearPedido, Pedido>({
    tipo: OP_PEDIDO.crear,
    api: PedidosApi,
    enviar: (api, { request }) => api.create(request),
    crea: ({ tempId }) => tempId,
    idsCreados,
  }),
  definirManejador<PedidosApi, EstadoLinea, PedidoLineaDto>({
    tipo: OP_PEDIDO.estadoLinea,
    api: PedidosApi,
    enviar: (api, { lineaId, estado }) => api.changeLineStatus(lineaId, estado),
    idempotente: true,
  }),
  definirManejador<PedidosApi, EditarPedido, Pedido>({
    tipo: OP_PEDIDO.editar,
    api: PedidosApi,
    enviar: (api, { pedidoId, cuerpo }) => api.put(pedidoId, cuerpo),
    idempotente: true,
  }),
  definirManejador<PedidosApi, CancelarPedido, Pedido>({
    tipo: OP_PEDIDO.cancelar,
    api: PedidosApi,
    enviar: (api, { pedidoId }) => api.cancel(pedidoId),
    idempotente: true,
  }),
  definirManejador<PedidosApi, CancelarLinea, PedidoLineaDto>({
    tipo: OP_PEDIDO.cancelarLinea,
    api: PedidosApi,
    enviar: (api, { lineaId }) => api.cancelLine(lineaId),
    idempotente: true,
  }),
];
