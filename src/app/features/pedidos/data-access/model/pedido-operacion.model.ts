import { LineStatus } from '../../../../shared/models/status';
import { PurchasedDto } from '../dto/pedido.dto';
import { CuerpoCambios, PurchasedRequest } from '../mapper/pedido-request';
import { CambiosPedido } from './pedido.model';

/** Las escrituras de pedidos que pueden hacerse sin conexión (cola de ENCUERDATU-51). */
export const OP_PEDIDO = {
  crear: 'pedido.crear',
  estadoLinea: 'pedido.linea.estado',
  editar: 'pedido.editar',
  cancelar: 'pedido.cancelar',
  cancelarLinea: 'pedido.linea.cancelar',
} as const;

export interface CrearPedido {
  tempId: string;
  request: PurchasedRequest;
  /** El pedido tal como se verá hasta que el servidor devuelva el real. */
  vista: PurchasedDto;
}

export interface EstadoLinea {
  pedidoId: string;
  lineaId: string;
  estado: LineStatus;
}

export interface EditarPedido {
  pedidoId: string;
  /** Lo que se envía, calculado al editar. */
  cuerpo: CuerpoCambios;
  /** Lo que se ve mientras tanto. */
  cambios: CambiosPedido;
}

export interface CancelarPedido {
  pedidoId: string;
}

export interface CancelarLinea {
  pedidoId: string;
  lineaId: string;
}

/** Una operación de la cola, ya con su tipo: así el payload se lee sin adivinar. */
export type OperacionPedido =
  | { tipo: typeof OP_PEDIDO.crear; payload: CrearPedido }
  | { tipo: typeof OP_PEDIDO.estadoLinea; payload: EstadoLinea }
  | { tipo: typeof OP_PEDIDO.editar; payload: EditarPedido }
  | { tipo: typeof OP_PEDIDO.cancelar; payload: CancelarPedido }
  | { tipo: typeof OP_PEDIDO.cancelarLinea; payload: CancelarLinea };

const TIPOS = new Set<string>(Object.values(OP_PEDIDO));

export function esOperacionPedido<T extends { tipo: string }>(op: T): op is T & OperacionPedido {
  return TIPOS.has(op.tipo);
}
