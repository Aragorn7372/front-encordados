import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OutboxService } from '../../../../core/offline/outbox.service';
import { TournamentContext } from '../../../../core/tournament-context/tournament-context';
import { aplicarPendientes, materialDeOperacion } from '../mapper/material-pendiente';
import { MaterialesEscrituras } from './materiales-escrituras';
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
  private readonly outbox = inject(OutboxService);
  private readonly escrituras = inject(MaterialesEscrituras);

  readonly tournamentId = this.context.selectedId;
  readonly busqueda = signal('');
  readonly tipo = signal<TipoMaterial | ''>('');
  readonly soloStockBajo = signal(false);

  private readonly result = rxResource({
    params: () => this.tournamentId() ?? undefined,
    stream: ({ params }) => this.api.list(params),
  });

  private readonly page = computed(() => (this.result.hasValue() ? this.result.value() : null));

  /** Lo del servidor (o su copia). Editable: el ± de stock cambia la fila sin recargar. */
  private readonly base = linkedSignal<Material[]>(() => this.page()?.materiales ?? []);
  /** Lo que se ve: la base con los cambios sin enviar encima (ENCUERDATU-51). */
  readonly todos = computed(() => aplicarPendientes(this.base(), this.outbox.pendientes()));
  /** Materiales con cambios en la cola, para marcarlos «sin enviar». */
  readonly sinEnviar = computed(
    () =>
      new Set(
        this.outbox
          .pendientes()
          .map(materialDeOperacion)
          .filter((id) => id !== null),
      ),
  );
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

  constructor() {
    // Con la cola enviada, datos frescos (y su copia)
    this.outbox.sincronizada$.pipe(takeUntilDestroyed()).subscribe(() => this.reload());
  }

  reload(): void {
    this.result.reload();
  }

  /**
   * Optimista: el número cambia al momento y vuelve si el servidor falla. Se envía el material
   * entero, no solo el stock: sin precio el backend lo pondría a 0 (ENCUERDATU-69). Sin conexión queda
   * en la cola y desde ahí se sigue viendo.
   */
  async ajustarStock(material: Material, delta: number): Promise<void> {
    const stock = Math.max(0, material.stock + delta);
    if (stock === material.stock) return;
    this.reemplazar({ ...material, stock });
    try {
      const guardado = await this.escrituras.ajustarStock(material, {
        ...toMaterialFormValue(material),
        stock,
      });
      // En la cola: la base vuelve a ser lo del servidor y el cambio lo pone la cola encima
      this.reemplazar(guardado ?? material);
    } catch {
      this.reemplazar(material); // Ya se ha avisado del error
    }
  }

  private reemplazar(material: Material): void {
    this.base.update((lista) => lista.map((m) => (m.id === material.id ? material : m)));
  }
}
