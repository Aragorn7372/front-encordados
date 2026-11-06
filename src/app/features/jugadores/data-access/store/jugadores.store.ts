import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { TournamentContext } from '../../../../core/tournament-context/tournament-context';
import { JugadoresApi } from '../api/jugadores.api';
import { coincideJugador } from '../mapper/jugador.mapper';
import { Jugador } from '../model/jugador.model';

/** Los jugadores del torneo activo. La búsqueda filtra en el cliente, sin volver a pedir nada. */
@Injectable()
export class JugadoresStore {
  private readonly api = inject(JugadoresApi);
  private readonly context = inject(TournamentContext);

  /** Los jugadores son de un torneo: sin torneo activo no hay lista que pedir. */
  readonly tournamentId = this.context.selectedId;
  readonly busqueda = signal('');

  private readonly result = rxResource({
    params: () => this.tournamentId() ?? undefined,
    stream: ({ params }) => this.api.list(params),
  });

  private readonly page = computed(() => (this.result.hasValue() ? this.result.value() : null));

  readonly todos = computed<Jugador[]>(() => this.page()?.jugadores ?? []);
  readonly jugadores = computed(() =>
    this.todos().filter((jugador) => coincideJugador(jugador, this.busqueda())),
  );
  readonly total = computed(() => this.page()?.total ?? 0);
  readonly loading = this.result.isLoading;
  readonly failed = computed(() => this.result.error() !== undefined);

  reload(): void {
    this.result.reload();
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.api.remove(id));
    this.reload();
  }
}
