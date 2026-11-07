import { Injectable, inject } from '@angular/core';
import { OutboxService } from '../../../../core/offline/outbox.service';
import { describir } from '../mapper/material-pendiente';
import { BorrarMaterial, EditarMaterial, OP_MATERIAL } from '../model/material-operacion.model';
import { Material, MaterialFormValue } from '../model/material.model';

/**
 * Las escrituras de materiales, con o sin conexión (como PedidosEscrituras). Devuelven lo que
 * respondió el servidor, o null si quedó en la cola (la lista lo muestra igualmente).
 */
@Injectable({ providedIn: 'root' })
export class MaterialesEscrituras {
  private readonly outbox = inject(OutboxService);

  /** Desde el formulario: sus errores de validación se lanzan para pintarlos en línea. */
  async editar(actual: Material, value: MaterialFormValue): Promise<Material | null> {
    const payload: EditarMaterial = { id: actual.id, value };
    const resultado = await this.outbox.ejecutar<Material>(
      OP_MATERIAL.editar,
      payload,
      describir.editar(actual),
    );
    return resultado.enviada ? resultado.respuesta : null;
  }

  /** El ± de stock: el material entero con el stock nuevo. Un error sale en un toast. */
  async ajustarStock(actual: Material, value: MaterialFormValue): Promise<Material | null> {
    const payload: EditarMaterial = { id: actual.id, value };
    const resultado = await this.outbox.ejecutar<Material>(
      OP_MATERIAL.editar,
      payload,
      describir.stock(actual, value.stock),
      { avisarError: true },
    );
    return resultado.enviada ? resultado.respuesta : null;
  }

  async borrar(actual: Material): Promise<boolean> {
    const payload: BorrarMaterial = { id: actual.id };
    const resultado = await this.outbox.ejecutar(
      OP_MATERIAL.borrar,
      payload,
      describir.borrar(actual),
      {
        avisarError: true,
      },
    );
    return resultado.enviada;
  }
}
