import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../../../core/auth/store/auth.store';
import { TournamentNotification } from '../../../../core/realtime/realtime.models';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { TournamentContext } from '../../../../core/tournament-context/tournament-context';
import { PedidoLineaDto, PurchasedDto } from '../dto/pedido.dto';
import { conLinea, conLineaPedido, estadoDestino, toPedido } from '../mapper/pedido.mapper';
import { Columna, LineaPedido, Pedido, Tarjeta } from '../model/pedido.model';
import { PedidosApi } from '../api/pedidos.api';

@Injectable()
export class PedidosStore {
  private readonly api = inject(PedidosApi);
  private readonly auth = inject(AuthStore);
  private readonly context = inject(TournamentContext);

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

  /** Editable para poder mover tarjetas al momento sin esperar al servidor. */
  readonly pedidos = linkedSignal<Pedido[]>(() => this.page()?.pedidos ?? []);
  readonly total = computed(() => this.page()?.total ?? 0);
  readonly loading = this.result.isLoading;
  readonly failed = computed(() => this.result.error() !== undefined);

  constructor() {
    const realtime = inject(RealtimeService);
    realtime.events$.pipe(takeUntilDestroyed()).subscribe((event) => this.apply(event));
    realtime.reconnected$.pipe(takeUntilDestroyed()).subscribe(() => this.reload());
  }

  /**
   * Cada tarjeta es una raqueta: moverla cambia el estado de su línea, no el del pedido.
   * Optimista: se mueve ya y vuelve a su sitio si el servidor falla.
   */
  async move({ pedido, linea, columna: origen }: Tarjeta, columna: Columna): Promise<void> {
    if (origen === columna || linea.estado === 'CANCELED') return;

    this.setLinea(pedido.id, { ...linea, estado: estadoDestino(columna) });

    try {
      const actualizada = await firstValueFrom(
        this.api.changeLineStatus(linea.id, estadoDestino(columna)),
      );
      this.applyLine(pedido.id, actualizada);
    } catch {
      this.setLinea(pedido.id, linea); // El interceptor ya ha mostrado el error
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
    this.pedidos.update((pedidos) =>
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
        this.pedidos.update((pedidos) =>
          pedidos.map((pedido) =>
            pedido.id === event.pedidoId
              ? conLinea(pedido, event.purchased as PedidoLineaDto)
              : pedido,
          ),
        );
        break;
    }
  }

  private upsert(pedido: Pedido): void {
    const visible = this.belongsHere(pedido);
    this.pedidos.update((pedidos) => {
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
    this.pedidos.update((pedidos) =>
      pedidos.map((pedido) => (pedido.id === pedidoId ? conLineaPedido(pedido, linea) : pedido)),
    );
  }
}
