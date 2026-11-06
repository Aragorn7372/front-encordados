import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { TournamentContext } from '../../../../core/tournament-context/tournament-context';
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

  readonly tournamentId = this.context.selectedId;
  readonly busqueda = signal('');
  readonly tipo = signal<TipoCuerda | ''>('');
  readonly soloStockBajo = signal(false);

  private readonly result = rxResource({
    params: () => this.tournamentId() ?? undefined,
    stream: ({ params }) => this.api.list(params),
  });

  private readonly page = computed(() => (this.result.hasValue() ? this.result.value() : null));

  /** Editable: el ± de stock cambia la fila sin recargar toda la lista. */
  readonly todos = linkedSignal<Cordaje[]>(() => this.page()?.cordajes ?? []);
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

  reload(): void {
    this.result.reload();
  }

  /**
   * Optimista: el número cambia al momento y vuelve si el servidor falla. Se envía el cordaje
   * entero, no solo el stock, para no depender de qué ignora el backend.
   */
  async ajustarStock(cordaje: Cordaje, delta: number): Promise<void> {
    const stock = Math.max(0, cordaje.stock + delta);
    if (stock === cordaje.stock) return;
    this.reemplazar({ ...cordaje, stock });
    try {
      this.reemplazar(
        await firstValueFrom(
          this.api.update(cordaje.id, { ...toCordajeFormValue(cordaje), stock }),
        ),
      );
    } catch {
      this.reemplazar(cordaje); // El interceptor ya ha mostrado el error
    }
  }

  async remove(id: number): Promise<void> {
    await firstValueFrom(this.api.remove(id));
    this.reload();
  }

  private reemplazar(cordaje: Cordaje): void {
    this.todos.update((lista) => lista.map((c) => (c.id === cordaje.id ? cordaje : c)));
  }
}
