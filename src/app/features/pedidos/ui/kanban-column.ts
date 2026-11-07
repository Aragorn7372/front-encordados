import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Columna, Tarjeta } from '../data-access/model/pedido.model';
import { LineaCard } from './linea-card';

export interface TarjetaMovida {
  tarjeta: Tarjeta;
  columna: Columna;
}

@Component({
  selector: 'app-kanban-column',
  imports: [CdkDrag, CdkDropList, LineaCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-base-200 rounded-box flex h-full flex-col p-3">
      <h2 class="mb-3 flex items-center justify-between font-bold">
        {{ label() }}
        <span class="badge" [attr.aria-label]="tarjetas().length + ' raquetas'">
          {{ tarjetas().length }}
        </span>
      </h2>

      <div
        class="flex min-h-24 flex-1 flex-col gap-2"
        cdkDropList
        [cdkDropListDisabled]="readonly()"
        [cdkDropListData]="columna()"
        (cdkDropListDropped)="onDrop($event)"
      >
        @for (tarjeta of tarjetas(); track tarjeta.linea.id) {
          <app-linea-card
            cdkDrag
            [cdkDragData]="tarjeta"
            [cdkDragDisabled]="readonly() || tarjeta.linea.estado === 'CANCELED'"
            [tarjeta]="tarjeta"
            [readonly]="readonly()"
            [canRepeat]="puedeRepetir()"
            [sinEnviar]="sinEnviar().has(tarjeta.pedido.id)"
            (moved)="movida.emit({ tarjeta, columna: $event })"
            (opened)="abierta.emit(tarjeta)"
            (repeat)="repetir.emit(tarjeta)"
            (cancelRequest)="cancelar.emit(tarjeta)"
          />
        } @empty {
          <p class="py-4 text-center text-sm opacity-50">Sin raquetas</p>
        }
      </div>
    </section>
  `,
})
export class KanbanColumn {
  readonly columna = input.required<Columna>();
  readonly label = input.required<string>();
  readonly tarjetas = input.required<Tarjeta[]>();
  readonly readonly = input(false);
  readonly puedeRepetir = input(false);
  /** Pedidos con cambios en la cola, aún sin llegar al servidor. */
  readonly sinEnviar = input<ReadonlySet<string>>(new Set());
  readonly movida = output<TarjetaMovida>();
  readonly abierta = output<Tarjeta>();
  readonly repetir = output<Tarjeta>();
  readonly cancelar = output<Tarjeta>();

  protected onDrop(event: CdkDragDrop<Columna, Columna, Tarjeta>) {
    if (event.previousContainer === event.container) return;
    // No se toca el array: la tarjeta cambia de columna cuando cambia el store
    this.movida.emit({ tarjeta: event.item.data, columna: this.columna() });
  }
}
