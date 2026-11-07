import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OutboxService } from '../../../../core/offline/outbox.service';
import { TournamentContext } from '../../../../core/tournament-context/tournament-context';
import { aplicarPendientes, cordajeDeOperacion } from '../mapper/cordaje-pendiente';
import { CordajesEscrituras } from './cordajes-escrituras';
import { nivelStock } from '../../../../shared/models/stock';
import { CordajesApi } from '../api/cordajes.api';
import { TipoCuerda } from '../dto/cordaje.dto';
import { coincideCordaje, toCordajeFormValue } from '../mapper/cordaje.mapper';
import { Cordaje } from '../model/cordaje.model';

/** Los cordajes del torneo activo. Búsqueda y filtros en el cliente. */
@Injectable()
export class CordajesStore {
  private readonly api = inject(CordajesApi);
  private readonly context = inject(TournamentContext);
  private readonly outbox = inject(OutboxService);
  private readonly escrituras = inject(CordajesEscrituras);

  readonly tournamentId = this.context.selectedId;
  readonly busqueda = signal('');
  readonly tipo = signal<TipoCuerda | ''>('');
  readonly soloStockBajo = signal(false);

  private readonly result = rxResource({
    params: () => this.tournamentId() ?? undefined,
    stream: ({ params }) => this.api.list(params),
  });

  private readonly page = computed(() => (this.result.hasValue() ? this.result.value() : null));

  /** Lo del servidor (o su copia). Editable: el ± de stock cambia la fila sin recargar. */
  private readonly base = linkedSignal<Cordaje[]>(() => this.page()?.cordajes ?? []);
  /** Lo que se ve: la base con los cambios sin enviar encima (ENCUERDATU-51). */
  readonly todos = computed(() => aplicarPendientes(this.base(), this.outbox.pendientes()));
  /** Cordajes con cambios en la cola, para marcarlos «sin enviar». */
  readonly sinEnviar = computed(
    () =>
      new Set(
        this.outbox
          .pendientes()
          .map(cordajeDeOperacion)
          .filter((id) => id !== null),
      ),
  );
  readonly cordajes = computed(() =>
    this.todos().filter(
      (cordaje) =>
        coincideCordaje(cordaje, this.busqueda()) &&
        (!this.tipo() || cordaje.tipo === this.tipo()) &&
        (!this.soloStockBajo() || nivelStock(cordaje.stock) !== 'ok'),
    ),
  );
  readonly stockBajo = computed(() => this.todos().filter((c) => nivelStock(c.stock) !== 'ok'));
  readonly total = computed(() => this.page()?.total ?? 0);
  readonly loading = this.result.isLoading;
  readonly failed = computed(() => this.result.error() !== undefined);

  constructor() {
    // Con la cola enviada, datos frescos (y su copia)
    this.outbox.sincronizada$.pipe(takeUntilDestroyed()).subscribe(() => this.reload());
  }

  reload(): void {
    this.result.reload();
  }

  /**
   * Optimista: el número cambia al momento y vuelve si el servidor falla. Se envía el cordaje
   * entero, no solo el stock, para no depender de qué ignora el backend. Sin conexión queda
   * en la cola y desde ahí se sigue viendo.
   */
  async ajustarStock(cordaje: Cordaje, delta: number): Promise<void> {
    const stock = Math.max(0, cordaje.stock + delta);
    if (stock === cordaje.stock) return;
    this.reemplazar({ ...cordaje, stock });
    try {
      const guardado = await this.escrituras.ajustarStock(cordaje, {
        ...toCordajeFormValue(cordaje),
        stock,
      });
      // En la cola: la base vuelve a ser lo del servidor y el cambio lo pone la cola encima
      this.reemplazar(guardado ?? cordaje);
    } catch {
      this.reemplazar(cordaje); // Ya se ha avisado del error
    }
  }

  private reemplazar(cordaje: Cordaje): void {
    this.base.update((lista) => lista.map((c) => (c.id === cordaje.id ? cordaje : c)));
  }
}
