import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { ExcelActions } from '../../../core/excel/excel-actions';
import { ToastService } from '../../../core/toast/toast.service';
import { STOCK_BAJO } from '../../../shared/models/stock';
import { EmptyState } from '../../../shared/ui/empty-state';
import { Modal } from '../../../shared/ui/modal';
import { PageHeader } from '../../../shared/ui/page-header';
import { SearchInput } from '../../../shared/ui/search-input';
import { StockControl } from '../../../shared/ui/stock-control';
import { MATERIALES_MAX } from '../data-access/api/materiales.api';
import { TIPOS_MATERIAL, TipoMaterial } from '../data-access/dto/material.dto';
import { Material, TIPO_MATERIAL_LABEL } from '../data-access/model/material.model';
import { MaterialesStore } from '../data-access/store/materiales.store';
import { MaterialForm } from '../ui/material-form';

/** `undefined`: formulario cerrado. `null`: creando. Con valor: editando ese material. */
type Editing = Material | null | undefined;

/** Inventario de materiales del torneo activo. Solo ADMIN y OWNER llegan aquí (la ruta lo exige). */
@Component({
  selector: 'app-materiales-page',
  imports: [
    MaterialForm,
    CurrencyPipe,
    EmptyState,
    ExcelActions,
    Modal,
    PageHeader,
    SearchInput,
    StockControl,
  ],
  providers: [MaterialesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header heading="Materiales">
      <app-excel-actions
        [tournamentId]="store.tournamentId()"
        [tipos]="['materials']"
        nombre="materiales.xlsx"
        (importado)="store.reload()"
      />
      <button
        type="button"
        class="btn btn-primary"
        [disabled]="!store.tournamentId()"
        (click)="editing.set(null)"
      >
        Nuevo material
      </button>
    </app-page-header>

    @if (!store.tournamentId()) {
      <app-empty-state
        heading="Selecciona un torneo"
        message="Cada torneo tiene su inventario: elige uno en la barra superior."
      />
    } @else {
      @if (store.stockBajo().length; as cuantos) {
        <div role="status" class="alert alert-warning alert-soft mb-4">
          {{ cuantos }} {{ cuantos === 1 ? 'material tiene' : 'materiales tienen' }} {{ umbral }} o
          menos en stock.
          <button type="button" class="btn btn-sm" (click)="store.soloStockBajo.set(true)">
            Ver cuáles
          </button>
        </div>
      }

      <div class="mb-4 flex flex-wrap items-center gap-2">
        <div class="w-full max-w-sm">
          <app-search-input
            placeholder="Buscar por marca, modelo o tipo…"
            (searched)="store.busqueda.set($event)"
          />
        </div>
        <select class="select w-auto" aria-label="Filtrar por tipo" (change)="onTipo($event)">
          <option value="">Todos los tipos</option>
          @for (tipo of tipos; track tipo) {
            <option [value]="tipo">{{ tipoLabel[tipo] }}</option>
          }
        </select>
        <label class="label cursor-pointer gap-2">
          <input
            type="checkbox"
            class="checkbox checkbox-sm"
            [checked]="store.soloStockBajo()"
            (change)="onSoloStockBajo($event)"
          />
          Solo stock bajo
        </label>
      </div>

      @if (store.total() > store.todos().length) {
        <div role="status" class="alert alert-warning alert-soft mb-4">
          Se muestran los {{ limite }} primeros de {{ store.total() }} materiales.
        </div>
      }

      @if (store.failed()) {
        <app-empty-state
          heading="No se han podido cargar los materiales"
          message="Inténtalo de nuevo en unos segundos."
        />
      } @else if (store.todos().length === 0 && !store.loading()) {
        <app-empty-state
          heading="Este torneo aún no tiene materiales"
          message="Añádelos con «Nuevo material» o importando un Excel."
        />
      } @else {
        <div class="overflow-x-auto" [attr.aria-busy]="store.loading()">
          <table class="table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Tipo</th>
                <th class="text-right">Precio</th>
                <th class="text-right">Stock</th>
                <th><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (material of store.materiales(); track material.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      <img
                        class="rounded-box size-10 object-cover"
                        alt=""
                        loading="lazy"
                        [src]="material.imagen"
                      />
                      <div>
                        <div class="font-medium">{{ material.modelo }}</div>
                        <div class="text-xs opacity-60">{{ material.marca }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ tipoLabel[material.tipo] }}</td>
                  <td class="text-right tabular-nums">{{ material.precio | currency: 'EUR' }}</td>
                  <td>
                    <app-stock-control
                      [stock]="material.stock"
                      [nombre]="material.modelo"
                      (cambio)="store.ajustarStock(material, $event)"
                    />
                  </td>
                  <td class="text-right whitespace-nowrap">
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs"
                      [attr.aria-label]="'Editar ' + material.modelo"
                      (click)="editing.set(material)"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs text-error"
                      [attr.aria-label]="'Borrar ' + material.modelo"
                      (click)="borrar(material)"
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="py-6 text-center opacity-60">
                    Ningún material coincide con los filtros.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    <app-modal
      [heading]="editing() ? 'Editar material' : 'Nuevo material'"
      [open]="editing() !== undefined"
      [wide]="true"
      (closed)="editing.set(undefined)"
    >
      <!-- ng-content no es perezoso: el formulario debe nacer al abrirse -->
      @if (editing() !== undefined && store.tournamentId(); as torneo) {
        <app-material-form
          [tournamentId]="torneo"
          [material]="editing() ?? null"
          (saved)="onSaved()"
          (cancelled)="editing.set(undefined)"
        />
      }
    </app-modal>
  `,
})
export default class MaterialesPage {
  protected readonly store = inject(MaterialesStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly editing = signal<Editing>(undefined);
  protected readonly tipos = TIPOS_MATERIAL;
  protected readonly tipoLabel = TIPO_MATERIAL_LABEL;
  protected readonly umbral = STOCK_BAJO;
  protected readonly limite = MATERIALES_MAX;
  protected readonly creando = computed(() => this.editing() === null);

  protected onTipo(event: Event): void {
    this.store.tipo.set((event.target as HTMLSelectElement).value as TipoMaterial | '');
  }

  protected onSoloStockBajo(event: Event): void {
    this.store.soloStockBajo.set((event.target as HTMLInputElement).checked);
  }

  protected onSaved(): void {
    this.toast.success(this.creando() ? 'Material creado' : 'Material actualizado');
    this.editing.set(undefined);
    this.store.reload();
  }

  protected async borrar(material: Material): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Borrar material',
      message: `¿Borrar ${material.marca} ${material.modelo}?`,
      confirmText: 'Borrar',
      cancelText: 'Volver',
      danger: true,
    });
    if (!ok) return;
    try {
      await this.store.remove(material.id);
      this.toast.success('Material borrado');
    } catch {
      // El interceptor ya ha mostrado el error
    }
  }
}
