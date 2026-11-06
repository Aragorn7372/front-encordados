import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { TournamentContext } from '../../../../core/tournament-context/tournament-context';
import { nivelStock } from '../../../../shared/models/stock';
import { MaterialesApi } from '../api/materiales.api';
import { TipoMaterial } from '../dto/material.dto';
import { coincideMaterial, toMaterialFormValue } from '../mapper/material.mapper';
import { Material } from '../model/material.model';

/** Los materiales del torneo activo. Búsqueda y filtros en el cliente. */
@Injectable()
export class MaterialesStore {
  private readonly api = inject(MaterialesApi);
  private readonly context = inject(TournamentContext);

  readonly tournamentId = this.context.selectedId;
  readonly busqueda = signal('');
  readonly tipo = signal<TipoMaterial | ''>('');
  readonly soloStockBajo = signal(false);

  private readonly result = rxResource({
    params: () => this.tournamentId() ?? undefined,
    stream: ({ params }) => this.api.list(params),
  });

  private readonly page = computed(() => (this.result.hasValue() ? this.result.value() : null));

  /** Editable: el ± de stock cambia la fila sin recargar toda la lista. */
  readonly todos = linkedSignal<Material[]>(() => this.page()?.materiales ?? []);
  readonly materiales = computed(() =>
    this.todos().filter(
      (material) =>
        coincideMaterial(material, this.busqueda()) &&
        (!this.tipo() || material.tipo === this.tipo()) &&
        (!this.soloStockBajo() || nivelStock(material.stock) !== 'ok'),
    ),
  );
  readonly stockBajo = computed(() => this.todos().filter((m) => nivelStock(m.stock) !== 'ok'));
  readonly total = computed(() => this.page()?.total ?? 0);
  readonly loading = this.result.isLoading;
  readonly failed = computed(() => this.result.error() !== undefined);

  reload(): void {
    this.result.reload();
  }

  /** Optimista, y con el material entero: sin precio el backend lo pondría a 0 (ENCUERDATU-69). */
  async ajustarStock(material: Material, delta: number): Promise<void> {
    const stock = Math.max(0, material.stock + delta);
    if (stock === material.stock) return;
    this.reemplazar({ ...material, stock });
    try {
      this.reemplazar(
        await firstValueFrom(
          this.api.update(material.id, { ...toMaterialFormValue(material), stock }),
        ),
      );
    } catch {
      this.reemplazar(material); // El interceptor ya ha mostrado el error
    }
  }

  async remove(id: number): Promise<void> {
    await firstValueFrom(this.api.remove(id));
    this.reload();
  }

  private reemplazar(material: Material): void {
    this.todos.update((lista) => lista.map((m) => (m.id === material.id ? material : m)));
  }
}
