import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LINE_STATUS, LineStatus } from '../../../shared/models/status';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { lineaCancelable } from '../data-access/mapper/pedido.mapper';
import { LineaPedido } from '../data-access/model/pedido.model';

export interface CambioLinea {
  linea: LineaPedido;
  estado: LineStatus;
  /** Devuelve el selector al estado real si el servidor rechaza el cambio. */
  revertir: () => void;
}

/** Se cancela con su propia acción (ENCUERDATU-40), no desde este selector. */
const ESTADOS_SELECCIONABLES: LineStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'DELIVERED_TOpLAYER',
];

@Component({
  selector: 'app-pedido-lineas',
  imports: [DatePipe, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="divide-base-300 divide-y">
      @for (linea of lineas(); track linea.id) {
        <li class="flex flex-wrap items-start justify-between gap-3 py-3">
          <div class="min-w-0 flex-1">
            @if (linea.tipo === 'encordado') {
              <p class="font-medium">{{ linea.raqueta }}</p>
              <p class="text-sm opacity-80">
                V: {{ linea.vertical.cuerda }} · {{ linea.vertical.tension }} kg ·
                {{ linea.vertical.preestirado }}%
              </p>
              <p class="text-sm opacity-80">
                H: {{ linea.horizontal.cuerda || linea.vertical.cuerda }} ·
                {{ linea.horizontal.tension }} kg · {{ linea.horizontal.preestirado }}%
              </p>
              <p class="text-xs opacity-60">
                {{ linea.nudos }} nudos · {{ linea.logo ? 'Con logo' : 'Sin logo' }}
                @if (linea.color) {
                  · {{ linea.color }}
                }
              </p>
            } @else {
              <p class="font-medium">{{ linea.cantidad }} × {{ linea.articulo }}</p>
              @if (linea.notas) {
                <p class="text-sm opacity-80">{{ linea.notas }}</p>
              }
              @if (linea.cuando) {
                <p class="text-xs opacity-60">Cuándo: {{ linea.cuando }}</p>
              }
            }
            @if (linea.fecha) {
              <p class="text-xs opacity-60">Para el {{ linea.fecha | date: 'short' }}</p>
            }
          </div>

          @if (canManage() && linea.estado !== 'CANCELED') {
            <div class="flex items-center gap-1">
              <select
                class="select select-sm w-auto"
                [attr.aria-label]="'Estado de ' + nombre(linea)"
                (change)="onChange(linea, $event)"
              >
                @for (estado of estados; track estado) {
                  <option [value]="estado" [selected]="estado === linea.estado">
                    {{ etiqueta[estado].label }}
                  </option>
                }
              </select>
              @if (cancelable(linea)) {
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  [attr.aria-label]="'Cancelar ' + nombre(linea)"
                  (click)="cancelled.emit(linea)"
                >
                  ✕
                </button>
              }
            </div>
          } @else {
            <app-status-badge [status]="etiqueta[linea.estado]" />
          }
        </li>
      }
    </ul>
  `,
})
export class PedidoLineas {
  readonly lineas = input.required<LineaPedido[]>();
  readonly canManage = input(false);
  readonly changed = output<CambioLinea>();
  readonly cancelled = output<LineaPedido>();

  protected readonly cancelable = (linea: LineaPedido) => lineaCancelable(linea.estado);

  protected readonly estados = ESTADOS_SELECCIONABLES;
  protected readonly etiqueta = LINE_STATUS;

  protected nombre(linea: LineaPedido): string {
    return linea.tipo === 'encordado' ? linea.raqueta : linea.articulo;
  }

  protected onChange(linea: LineaPedido, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const estado = select.value as LineStatus;
    if (estado === linea.estado) return;
    this.changed.emit({ linea, estado, revertir: () => (select.value = linea.estado) });
  }
}
