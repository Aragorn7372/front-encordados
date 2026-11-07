import { Injectable, inject } from '@angular/core';
import { idTemporal } from '../../../../core/offline/outbox';
import { OutboxService } from '../../../../core/offline/outbox.service';
import {
  ContactoCreado,
  ContactoNuevo,
  CrearContacto,
  OP_CONTACTO_CREAR,
} from '../../../../shared/models/contacto-pendiente';
import { describir } from '../mapper/jugador-pendiente';
import {
  BonosJugador,
  BorrarJugador,
  EditarJugador,
  OP_JUGADOR,
} from '../model/jugador-operacion.model';
import { Jugador, JugadorEdicionValue } from '../model/jugador.model';

/**
 * Las escrituras de jugadores, con o sin conexión (como PedidosEscrituras). Devuelven si llegó
 * al servidor (true) o quedó en la cola (false); la lista lo muestra igualmente.
 * Los errores de validación se lanzan, para que el formulario los pinte.
 */
@Injectable({ providedIn: 'root' })
export class JugadoresEscrituras {
  private readonly outbox = inject(OutboxService);

  async crearContacto(request: ContactoNuevo): Promise<boolean> {
    const payload: CrearContacto = { tempId: idTemporal(), request };
    const resultado = await this.outbox.ejecutar<ContactoCreado>(
      OP_CONTACTO_CREAR,
      payload,
      describir.contacto(request.name),
    );
    return resultado.enviada;
  }

  async addBonos(jugador: Jugador, cantidad: number): Promise<boolean> {
    const payload: BonosJugador = { id: jugador.id, cantidad };
    const resultado = await this.outbox.ejecutar(
      OP_JUGADOR.bonos,
      payload,
      describir.bonos(jugador, cantidad),
    );
    return resultado.enviada;
  }

  async editar(jugador: Jugador, value: JugadorEdicionValue): Promise<boolean> {
    const payload: EditarJugador = { id: jugador.id, value };
    const resultado = await this.outbox.ejecutar(
      OP_JUGADOR.editar,
      payload,
      describir.editar(jugador),
    );
    return resultado.enviada;
  }

  async borrar(jugador: Jugador): Promise<boolean> {
    const payload: BorrarJugador = { id: jugador.id };
    const resultado = await this.outbox.ejecutar(
      OP_JUGADOR.borrar,
      payload,
      describir.borrar(jugador),
      { avisarError: true },
    );
    return resultado.enviada;
  }
}
