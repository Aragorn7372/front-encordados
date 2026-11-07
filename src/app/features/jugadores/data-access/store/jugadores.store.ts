import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OutboxService } from '../../../../core/offline/outbox.service';
import { TournamentContext } from '../../../../core/tournament-context/tournament-context';
import { aplicarPendientes, jugadorDeOperacion } from '../mapper/jugador-pendiente';
import { JugadoresApi } from '../api/jugadores.api';
import { coincideJugador } from '../mapper/jugador.mapper';
import { Jugador } from '../model/jugador.model';

/** Los jugadores del torneo activo. La búsqueda filtra en el cliente, sin volver a pedir nada. */
@Injectable()
export class JugadoresStore {
  private readonly api = inject(JugadoresApi);
  private readonly context = inject(TournamentContext);
  private readonly outbox = inject(OutboxService);

  /** Los jugadores son de un torneo: sin torneo activo no hay lista que pedir. */
  readonly tournamentId = this.context.selectedId;
  readonly busqueda = signal('');

  private readonly result = rxResource({
    params: () => this.tournamentId() ?? undefined,
    stream: ({ params }) => this.api.list(params),
  });

  private readonly page = computed(() => (this.result.hasValue() ? this.result.value() : null));

  /** Lo del servidor (o su copia) con los cambios sin enviar encima (ENCUERDATU-51). */
  readonly todos = computed<Jugador[]>(() =>
    aplicarPendientes(
      this.page()?.jugadores ?? [],
      this.outbox.pendientes(),
      this.outbox.ids(),
      this.tournamentId(),
    ),
  );
  /** Jugadores con cambios en la cola, para marcarlos «sin enviar». */
  readonly sinEnviar = computed(
    () =>
      new Set(
        this.outbox
          .pendientes()
          .map(jugadorDeOperacion)
          .filter((id) => id !== null),
      ),
  );
  readonly jugadores = computed(() =>
    this.todos().filter((jugador) => coincideJugador(jugador, this.busqueda())),
  );
  readonly total = computed(() => this.page()?.total ?? 0);
  readonly loading = this.result.isLoading;
  readonly failed = computed(() => this.result.error() !== undefined);

  constructor() {
    // Con la cola enviada, datos frescos (y su copia): los creados ya tienen su id real
    this.outbox.sincronizada$.pipe(takeUntilDestroyed()).subscribe(() => this.reload());
  }

  reload(): void {
    this.result.reload();
  }
}
