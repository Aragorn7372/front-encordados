import { Injectable, inject } from '@angular/core';
import { OutboxService } from '../../../../core/offline/outbox.service';
import { describir } from '../mapper/cordaje-pendiente';
import { BorrarCordaje, EditarCordaje, OP_CORDAJE } from '../model/cordaje-operacion.model';
import { Cordaje, CordajeFormValue } from '../model/cordaje.model';

/**
 * Las escrituras de cordajes, con o sin conexión (como PedidosEscrituras). Devuelven lo que
 * respondió el servidor, o null si quedó en la cola (la lista lo muestra igualmente).
 */
@Injectable({ providedIn: 'root' })
export class CordajesEscrituras {
  private readonly outbox = inject(OutboxService);

  /** Desde el formulario: sus errores de validación se lanzan para pintarlos en línea. */
  async editar(actual: Cordaje, value: CordajeFormValue): Promise<Cordaje | null> {
    const payload: EditarCordaje = { id: actual.id, value };
    const resultado = await this.outbox.ejecutar<Cordaje>(
      OP_CORDAJE.editar,
      payload,
      describir.editar(actual),
    );
    return resultado.enviada ? resultado.respuesta : null;
  }

  /** El ± de stock: el cordaje entero con el stock nuevo. Un error sale en un toast. */
  async ajustarStock(actual: Cordaje, value: CordajeFormValue): Promise<Cordaje | null> {
    const payload: EditarCordaje = { id: actual.id, value };
    const resultado = await this.outbox.ejecutar<Cordaje>(
      OP_CORDAJE.editar,
      payload,
      describir.stock(actual, value.stock),
      { avisarError: true },
    );
    return resultado.enviada ? resultado.respuesta : null;
  }

  async borrar(actual: Cordaje): Promise<boolean> {
    const payload: BorrarCordaje = { id: actual.id };
    const resultado = await this.outbox.ejecutar(
      OP_CORDAJE.borrar,
      payload,
      describir.borrar(actual),
      {
        avisarError: true,
      },
    );
    return resultado.enviada;
  }
}
