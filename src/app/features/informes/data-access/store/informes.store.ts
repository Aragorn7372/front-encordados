import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AuthStore } from '../../../../core/auth/store/auth.store';
import { TournamentContext } from '../../../../core/tournament-context/tournament-context';
import { InformesApi } from '../api/informes.api';
import {
  filtrar,
  ingresosPorDia,
  kpis,
  pedidosPorDia,
  porEstado,
  topPor,
} from '../mapper/informe.mapper';
import { FILTROS_VACIOS, FiltrosInforme, PedidoInforme } from '../model/informe.model';

/** Los pedidos del torneo se piden una vez; filtros, KPIs y series se recalculan solos. */
@Injectable()
export class InformesStore {
  private readonly api = inject(InformesApi);
  private readonly auth = inject(AuthStore);
  private readonly context = inject(TournamentContext);

  readonly tournamentId = this.context.selectedId;
  /** ADMIN puede ver todos los torneos juntos; OWNER y SUPERVISOR, uno (el backend lo exige). */
  readonly needsTournament = computed(() => !this.auth.hasRole('ADMIN') && !this.tournamentId());
  readonly filtros = signal<FiltrosInforme>(FILTROS_VACIOS);

  private readonly result = rxResource({
    params: () => (this.needsTournament() ? undefined : { tournamentId: this.tournamentId() }),
    stream: ({ params }) => this.api.pedidos(params.tournamentId),
  });

  private readonly page = computed(() => (this.result.hasValue() ? this.result.value() : null));
  readonly todos = computed<PedidoInforme[]>(() => this.page()?.pedidos ?? []);
  readonly total = computed(() => this.page()?.total ?? 0);
  readonly loading = this.result.isLoading;
  readonly failed = computed(() => this.result.error() !== undefined);

  readonly pedidos = computed(() => filtrar(this.todos(), this.filtros()));
  readonly kpis = computed(() => kpis(this.pedidos()));
  readonly porEstado = computed(() => porEstado(this.pedidos()));
  readonly porDia = computed(() => pedidosPorDia(this.pedidos()));
  readonly ingresos = computed(() => ingresosPorDia(this.pedidos()));
  readonly topEncordadores = computed(() => topPor(this.pedidos(), 'encordador'));
  readonly topJugadores = computed(() => topPor(this.pedidos(), 'jugador'));
  readonly hayFiltros = computed(() => Object.values(this.filtros()).some((valor) => valor !== ''));

  setFiltro<K extends keyof FiltrosInforme>(clave: K, valor: FiltrosInforme[K]): void {
    this.filtros.update((filtros) => ({ ...filtros, [clave]: valor }));
  }

  limpiar(): void {
    this.filtros.set(FILTROS_VACIOS);
  }

  reload(): void {
    this.result.reload();
  }
}
