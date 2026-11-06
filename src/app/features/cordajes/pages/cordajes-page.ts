import { CurrencyPipe, DecimalPipe } from '@angular/common';
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
import { CORDAJES_MAX } from '../data-access/api/cordajes.api';
import { TIPOS_CUERDA, TipoCuerda } from '../data-access/dto/cordaje.dto';
import { Cordaje, FORMATO_LABEL, TIPO_LABEL } from '../data-access/model/cordaje.model';
import { CordajesStore } from '../data-access/store/cordajes.store';
import { CordajeForm } from '../ui/cordaje-form';

/** `undefined`: formulario cerrado. `null`: creando. Con valor: editando ese cordaje. */
type Editing = Cordaje | null | undefined;

/** Inventario de cordajes del torneo activo. Solo ADMIN y OWNER llegan aquí (la ruta lo exige). */
@Component({
  selector: 'app-cordajes-page',
  imports: [
    CordajeForm,
    CurrencyPipe,
    DecimalPipe,
    EmptyState,
    ExcelActions,
    Modal,
    PageHeader,
    SearchInput,
    StockControl,
  ],
  providers: [CordajesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header heading="Cordajes">
      <app-excel-actions
        [tournamentId]="store.tournamentId()"
        [tipos]="['cuerdas']"
        nombre="cordajes.xlsx"
        (importado)="store.reload()"
      />
      <button
        type="button"
        class="btn btn-primary"
        [disabled]="!store.tournamentId()"
        (click)="editing.set(null)"
      >
        Nuevo cordaje
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
          {{ cuantos }} {{ cuantos === 1 ? 'cordaje tiene' : 'cordajes tienen' }} {{ umbral }} o
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

      @if (store.total() > limite) {
        <div role="status" class="alert alert-warning alert-soft mb-4">
          Se muestran los {{ limite }} primeros de {{ store.total() }} cordajes.
        </div>
      }

      @if (store.failed()) {
        <app-empty-state
          heading="No se han podido cargar los cordajes"
          message="Inténtalo de nuevo en unos segundos."
        />
      } @else if (store.todos().length === 0 && !store.loading()) {
        <app-empty-state
          heading="Este torneo aún no tiene cordajes"
          message="Añádelos con «Nuevo cordaje» o importando un Excel."
        />
      } @else {
        <div class="overflow-x-auto" [attr.aria-busy]="store.loading()">
          <table class="table">
            <thead>
              <tr>
                <th>Cordaje</th>
                <th>Tipo</th>
                <th class="text-right">Calibre</th>
                <th class="text-right">Precio</th>
                <th class="text-right">Stock</th>
                <th><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (cordaje of store.cordajes(); track cordaje.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      <img
                        class="rounded-box size-10 object-cover"
                        alt=""
                        loading="lazy"
                        [src]="cordaje.imagen"
                      />
                      <div>
                        <div class="font-medium">{{ cordaje.modelo }}</div>
                        <div class="text-xs opacity-60">{{ cordaje.marca }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {{ tipoLabel[cordaje.tipo] }}
                    <div class="text-xs opacity-60">{{ formatoLabel[cordaje.formato] }}</div>
                  </td>
                  <td class="text-right tabular-nums">{{ cordaje.calibre | number: '1.2-2' }}</td>
                  <td class="text-right tabular-nums">{{ cordaje.precio | currency: 'EUR' }}</td>
                  <td>
                    <app-stock-control
                      [stock]="cordaje.stock"
                      [nombre]="cordaje.modelo"
                      (cambio)="store.ajustarStock(cordaje, $event)"
                    />
                  </td>
                  <td class="text-right whitespace-nowrap">
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs"
                      [attr.aria-label]="'Editar ' + cordaje.modelo"
                      (click)="editing.set(cordaje)"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs text-error"
                      [attr.aria-label]="'Borrar ' + cordaje.modelo"
                      (click)="borrar(cordaje)"
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="py-6 text-center opacity-60">
                    Ningún cordaje coincide con los filtros.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    <app-modal
      [heading]="editing() ? 'Editar cordaje' : 'Nuevo cordaje'"
      [open]="editing() !== undefined"
      [wide]="true"
      (closed)="editing.set(undefined)"
    >
      <!-- ng-content no es perezoso: el formulario debe nacer al abrirse -->
      @if (editing() !== undefined && store.tournamentId(); as torneo) {
        <app-cordaje-form
          [tournamentId]="torneo"
          [cordaje]="editing() ?? null"
          (saved)="onSaved()"
          (cancelled)="editing.set(undefined)"
        />
      }
    </app-modal>
  `,
})
export default class CordajesPage {
  protected readonly store = inject(CordajesStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly editing = signal<Editing>(undefined);
  protected readonly tipos = TIPOS_CUERDA;
  protected readonly tipoLabel = TIPO_LABEL;
  protected readonly formatoLabel = FORMATO_LABEL;
  protected readonly umbral = STOCK_BAJO;
  protected readonly limite = CORDAJES_MAX;
  protected readonly creando = computed(() => this.editing() === null);

  protected onTipo(event: Event): void {
    this.store.tipo.set((event.target as HTMLSelectElement).value as TipoCuerda | '');
  }

  protected onSoloStockBajo(event: Event): void {
    this.store.soloStockBajo.set((event.target as HTMLInputElement).checked);
  }

  protected onSaved(): void {
    this.toast.success(this.creando() ? 'Cordaje creado' : 'Cordaje actualizado');
    this.editing.set(undefined);
    this.store.reload();
  }

  protected async borrar(cordaje: Cordaje): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Borrar cordaje',
      message: `¿Borrar ${cordaje.marca} ${cordaje.modelo}?`,
      confirmText: 'Borrar',
      cancelText: 'Volver',
      danger: true,
    });
    if (!ok) return;
    try {
      await this.store.remove(cordaje.id);
      this.toast.success('Cordaje borrado');
    } catch {
      // El interceptor ya ha mostrado el error
    }
  }
}
