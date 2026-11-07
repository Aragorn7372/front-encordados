import { Injectable, inject } from '@angular/core';
import { esTemporal, idTemporal } from '../../../../core/offline/outbox';
import { OutboxService } from '../../../../core/offline/outbox.service';
import { LineStatus } from '../../../../shared/models/status';
import { PedidoLineaDto } from '../dto/pedido.dto';
import { describir, vistaPrevia } from '../mapper/pedido-pendiente';
import { toPedido } from '../mapper/pedido.mapper';
import { PurchasedRequest, cuerpoCambios } from '../mapper/pedido-request';
import {
  CancelarLinea,
  CancelarPedido,
  CrearPedido,
  EditarPedido,
  EstadoLinea,
  OP_PEDIDO,
} from '../model/pedido-operacion.model';
import { CambiosPedido, LineaPedido, Pedido } from '../model/pedido.model';

export interface PedidoCreado {
  pedido: Pedido;
  /** false: sin conexión, está en la cola y se enviará al recuperarla. */
  enviado: boolean;
}

interface Persona {
  username: string;
  name: string;
  bonos?: number;
}

/**
 * Las escrituras de pedidos, con o sin conexión. Con red van al servidor como siempre; sin ella
 * quedan en la cola y el tablero las muestra ya (PedidosStore las aplica encima de los datos).
 * Devuelven lo que respondió el servidor, o null si ha quedado en la cola.
 */
@Injectable({ providedIn: 'root' })
export class PedidosEscrituras {
  private readonly outbox = inject(OutboxService);

  async crear(
    request: PurchasedRequest,
    jugador: Persona,
    encordador: Persona,
  ): Promise<PedidoCreado> {
    const tempId = idTemporal();
    const vista = vistaPrevia(request, tempId, jugador, encordador);
    const payload: CrearPedido = { tempId, request, vista };
    const resultado = await this.outbox.ejecutar<Pedido>(
      OP_PEDIDO.crear,
      payload,
      describir.crear(vista),
    );
    return resultado.enviada
      ? { pedido: resultado.respuesta, enviado: true }
      : { pedido: toPedido(vista), enviado: false };
  }

  async estadoLinea(
    pedido: Pedido,
    linea: LineaPedido,
    estado: LineStatus,
  ): Promise<PedidoLineaDto | null> {
    const payload: EstadoLinea = { pedidoId: pedido.id, lineaId: linea.id, estado };
    const resultado = await this.outbox.ejecutar<PedidoLineaDto>(
      OP_PEDIDO.estadoLinea,
      payload,
      describir.estadoLinea(pedido, linea, estado),
      { avisarError: true },
    );
    return resultado.enviada ? resultado.respuesta : null;
  }

  /** Errores de validación sin toast: el formulario los pinta en línea. */
  async editar(pedido: Pedido, cambios: CambiosPedido): Promise<Pedido | null> {
    const cuerpo = cuerpoCambios(pedido, cambios);
    // Nada que cambiar: no hace falta ni red ni cola
    if (Object.keys(cuerpo).length === 0) return pedido;
    const payload: EditarPedido = { pedidoId: pedido.id, cuerpo, cambios };
    const resultado = await this.outbox.ejecutar<Pedido>(
      OP_PEDIDO.editar,
      payload,
      describir.editar(pedido),
    );
    return resultado.enviada ? resultado.respuesta : null;
  }

  async cancelar(pedido: Pedido): Promise<Pedido | null> {
    // Creado sin conexión y aún sin enviar: basta con no enviarlo (ni avisar al jugador)
    if (esTemporal(pedido.id) && (await this.outbox.descartarCreacion(pedido.id))) return null;
    const payload: CancelarPedido = { pedidoId: pedido.id };
    const resultado = await this.outbox.ejecutar<Pedido>(
      OP_PEDIDO.cancelar,
      payload,
      describir.cancelar(pedido),
      { avisarError: true },
    );
    return resultado.enviada ? resultado.respuesta : null;
  }

  async cancelarLinea(pedido: Pedido, linea: LineaPedido): Promise<PedidoLineaDto | null> {
    const payload: CancelarLinea = { pedidoId: pedido.id, lineaId: linea.id };
    const resultado = await this.outbox.ejecutar<PedidoLineaDto>(
      OP_PEDIDO.cancelarLinea,
      payload,
      describir.cancelarLinea(pedido, linea),
      { avisarError: true },
    );
    return resultado.enviada ? resultado.respuesta : null;
  }
}
