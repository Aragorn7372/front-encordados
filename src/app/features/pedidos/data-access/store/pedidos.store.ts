import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthStore } from '../../../../core/auth/store/auth.store';
import { Operacion, esTemporal, sustituirIds } from '../../../../core/offline/outbox';
import { OutboxService } from '../../../../core/offline/outbox.service';
import { TournamentNotification } from '../../../../core/realtime/realtime.models';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { TournamentContext } from '../../../../core/tournament-context/tournament-context';
import { PedidoLineaDto, PurchasedDto } from '../dto/pedido.dto';
import { aplicarPendientes, pedidoDeOperacion } from '../mapper/pedido-pendiente';
import { conLinea, conLineaPedido, estadoDestino, toPedido } from '../mapper/pedido.mapper';
import { OP_PEDIDO, esOperacionPedido } from '../model/pedido-operacion.model';
import { Columna, LineaPedido, Pedido, Tarjeta } from '../model/pedido.model';
import { PedidosApi } from '../api/pedidos.api';
import { PedidosEscrituras } from './pedidos-escrituras';

@Injectable()
export class PedidosStore {
  private readonly api = inject(PedidosApi);
  private readonly auth = inject(AuthStore);
  private readonly context = inject(TournamentContext);
  private readonly outbox = inject(OutboxService);
  private readonly escrituras = inject(PedidosEscrituras);

  /** USER ve sus pedidos sean del torneo que sean. */
  private readonly tournamentId = computed(() =>
    this.auth.hasRole('USER') ? null : this.context.selectedId(),
  );

  /** El backend responde 403 a un OWNER que no indica torneo. */
  readonly needsTournament = computed(() => this.auth.hasRole('OWNER') && !this.tournamentId());

  private readonly result = rxResource({
    params: () => (this.needsTournament() ? undefined : { tournamentId: this.tournamentId() }),
    stream: ({ params }) => this.api.list(params.tournamentId),
  });

  private readonly page = computed(() => (this.result.hasValue() ? this.result.value() : null));

  /**
   * Lo que dice el servidor (o su copia guardada), al día con el tiempo real. Editable para
   * mover tarjetas al momento sin esperar al servidor.
   */
  private readonly base = linkedSignal<Pedido[]>(() => this.page()?.pedidos ?? []);
  private readonly operaciones = computed(() => this.outbox.pendientes().filter(esOperacionPedido));

  /** Lo que se ve: la base más los cambios de la cola que aún no han llegado al servidor. */
  readonly pedidos = computed(() =>
    aplicarPendientes(this.base(), this.operaciones(), this.outbox.ids()).filter(
      (pedido) => !esTemporal(pedido.id) || this.belongsHere(pedido),
    ),
  );
  /** Pedidos con cambios sin enviar, para marcarlos en el tablero. */
  readonly sinEnviar = computed(() => {
    const ids = this.outbox.ids();
    return new Set(this.operaciones().map((op) => pedidoDeOperacion(sustituirIds(op, ids))));
  });
  readonly total = computed(() => this.page()?.total ?? 0);
  readonly loading = this.result.isLoading;
  readonly failed = computed(() => this.result.error() !== undefined);

  constructor() {
    const realtime = inject(RealtimeService);
    realtime.events$.pipe(takeUntilDestroyed()).subscribe((event) => this.apply(event));
    realtime.reconnected$.pipe(takeUntilDestroyed()).subscribe(() => this.reload());
    this.outbox.enviadas$
      .pipe(takeUntilDestroyed())
      .subscribe(({ operacion, respuesta }) => this.aplicarEnviada(operacion, respuesta));
    // Con la cola vacía, datos frescos: también actualiza la copia guardada
    this.outbox.sincronizada$.pipe(takeUntilDestroyed()).subscribe(() => this.reload());
  }

  /**
   * Cada tarjeta es una raqueta: moverla cambia el estado de su línea, no el del pedido.
   * Optimista: se mueve ya y vuelve a su sitio si el servidor falla. Sin conexión queda en la
   * cola, y desde ahí se sigue viendo movida.
   */
  async move({ pedido, linea, columna: origen }: Tarjeta, columna: Columna): Promise<void> {
    if (origen === columna || linea.estado === 'CANCELED') return;
    const estado = estadoDestino(columna);

    this.setLinea(pedido.id, { ...linea, estado });
    try {
      const actualizada = await this.escrituras.estadoLinea(pedido, linea, estado);
      if (actualizada) this.applyLine(pedido.id, actualizada);
      // En la cola: la base vuelve a ser lo del servidor y el cambio lo pone la cola encima
      else this.setLinea(pedido.id, linea);
    } catch {
      this.setLinea(pedido.id, linea); // Ya se ha avisado del error
    }
  }

  reload(): void {
    this.result.reload();
  }

  /** Para lo que devuelve el servidor tras editar desde el detalle. */
  applyChange(pedido: Pedido): void {
    this.upsert(pedido);
  }

  applyLine(pedidoId: string, linea: PedidoLineaDto): void {
    this.base.update((pedidos) =>
      pedidos.map((pedido) => (pedido.id === pedidoId ? conLinea(pedido, linea) : pedido)),
    );
  }

  /** Se actualiza solo la tarjeta afectada: recargar 200 pedidos por evento no escala. */
  private apply(event: TournamentNotification): void {
    switch (event.tipo) {
      case 'PEDIDO_CREADO':
      case 'PEDIDO_ACTUALIZADO':
      case 'PEDIDO_CANCELADO':
        this.upsert(toPedido(event.purchased as PurchasedDto));
        break;
      case 'ESTATUS_LINEA_PEDIDO_ACTUALIZADA':
      case 'LINEA_PEDIDO_ACTUALIZADA':
        this.base.update((pedidos) =>
          pedidos.map((pedido) =>
            pedido.id === event.pedidoId
              ? conLinea(pedido, event.purchased as PedidoLineaDto)
              : pedido,
          ),
        );
        break;
    }
  }

  /** La respuesta de un cambio que estaba en la cola. */
  private aplicarEnviada(operacion: Operacion, respuesta: unknown): void {
    if (!esOperacionPedido(operacion)) return;
    switch (operacion.tipo) {
      case OP_PEDIDO.estadoLinea:
      case OP_PEDIDO.cancelarLinea:
        this.applyLine(operacion.payload.pedidoId, respuesta as PedidoLineaDto);
        break;
      default:
        this.upsert(respuesta as Pedido);
    }
  }

  private upsert(pedido: Pedido): void {
    const visible = this.belongsHere(pedido);
    this.base.update((pedidos) => {
      const rest = pedidos.filter((p) => p.id !== pedido.id);
      if (!visible) return rest;
      return rest.length === pedidos.length
        ? [pedido, ...pedidos]
        : pedidos.map((p) => (p.id === pedido.id ? pedido : p));
    });
  }

  /** Los eventos llegan por torneo: el hub no sabe qué está viendo cada pantalla. */
  private belongsHere(pedido: Pedido): boolean {
    const tournamentId = this.tournamentId();
    if (tournamentId && pedido.tournamentId !== tournamentId) return false;
    if (this.needsTournament()) return false;
    return !this.auth.hasRole('ENCORDER') || pedido.encordador.username === this.auth.username();
  }

  /** Sobre el estado actual: deshacer un movimiento no pisa otros cambios del mismo pedido. */
  private setLinea(pedidoId: string, linea: LineaPedido): void {
    this.base.update((pedidos) =>
      pedidos.map((pedido) => (pedido.id === pedidoId ? conLineaPedido(pedido, linea) : pedido)),
    );
  }
}
