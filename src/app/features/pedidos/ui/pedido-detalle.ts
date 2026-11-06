import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LINE_STATUS, PAYMENT_STATUS, StatusInfo } from '../../../shared/models/status';
import { Icon } from '../../../shared/ui/icon';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { pedidoCancelable } from '../data-access/mapper/pedido.mapper';
import { LineaPedido, Pedido } from '../data-access/model/pedido.model';
import { PedidoLineaDto } from '../data-access/dto/pedido.dto';
import { PedidosApi } from '../data-access/api/pedidos.api';
import { CambioLinea, PedidoLineas } from './pedido-lineas';
import { PedidoEdicion } from './pedido-edicion';
import { injectCancelarLinea, injectCancelarPedido } from './cancelar-pedido';
import { Avatar } from '../../../shared/ui/avatar';

export interface LineaActualizada {
  pedidoId: string;
  linea: PedidoLineaDto;
}

@Component({
  selector: 'app-pedido-detalle',
  imports: [Avatar, CurrencyPipe, DatePipe, Icon, StatusBadge, PedidoLineas, PedidoEdicion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap gap-1">
      <app-status-badge [status]="estado()" />
      <app-status-badge [status]="pago()" />
      @if (pedido().tipo === 'taller') {
        <span class="badge badge-outline">Taller</span>
      }
      @if (pedido().materialPropio) {
        <span class="badge badge-outline">Material propio</span>
      }
    </div>

    <!--
      Una sola lista de datos, con el mismo estilo. Va en dos bloques con la misma rejilla y el
      mismo hueco a la derecha, para que el lápiz quede a la altura de lo que se puede editar.
    -->
    <section class="mb-4 flex flex-col gap-y-2 text-sm" aria-label="Datos del pedido">
      <div class="flex gap-2">
        <dl class="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2">
          <dt class="opacity-60">Jugador</dt>
          <dd class="flex items-center gap-2">
            <app-avatar
              size="xs"
              [url]="pedido().jugador.imageUrl"
              [nombre]="pedido().jugador.name || pedido().jugador.username"
            />
            {{ pedido().jugador.name || pedido().jugador.username }}
          </dd>
          <dt class="opacity-60">Encordador</dt>
          <dd class="flex items-center gap-2">
            <app-avatar
              size="xs"
              [url]="pedido().encordador.imageUrl"
              [nombre]="pedido().encordador.name || pedido().encordador.username"
            />
            {{ pedido().encordador.name || pedido().encordador.username }}
          </dd>
          <dt class="opacity-60">Precio</dt>
          <dd>{{ pedido().precio | currency: 'EUR' }}</dd>
          <dt class="opacity-60">Creado</dt>
          <dd>{{ pedido().creadoEn | date: 'short' }}</dd>
          @if (pedido().requeridoEn; as fecha) {
            <dt class="opacity-60">Para el</dt>
            <dd>{{ fecha | date: 'short' }}</dd>
          }
        </dl>
        <div class="w-8 shrink-0"></div>
      </div>

      <div class="flex items-start gap-2">
        <div class="min-w-0 flex-1">
          @if (editando()) {
            <app-pedido-edicion
              [pedido]="pedido()"
              (saved)="onGuardado($event)"
              (cancelled)="editando.set(false)"
            />
          } @else {
            <dl class="grid grid-cols-2 gap-x-4 gap-y-2">
              <dt class="opacity-60">Máquina</dt>
              <dd>{{ pedido().maquina || '—' }}</dd>
              <dt class="opacity-60">Pago</dt>
              <dd>{{ pago().label }}</dd>
              <dt class="col-span-2 opacity-60">Comentarios</dt>
              <dd class="col-span-2 whitespace-pre-line">
                {{ pedido().comentarios || 'Sin comentarios' }}
              </dd>
            </dl>
          }
        </div>
        <!-- Hueco fijo: las columnas no se mueven al aparecer o desaparecer el lápiz -->
        <div class="-mt-1.5 w-8 shrink-0">
          @if (canManage() && !editando()) {
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              aria-label="Editar pedido"
              title="Editar máquina, pago y comentarios"
              (click)="editando.set(true)"
            >
              <app-icon name="editar" />
            </button>
          }
        </div>
      </div>
    </section>

    <h3 class="font-bold">{{ pedido().tipo === 'taller' ? 'Artículos' : 'Raquetas' }}</h3>
    <app-pedido-lineas
      [lineas]="pedido().lineas"
      [canManage]="canManage()"
      (changed)="onLinea($event)"
      (cancelled)="cancelarLinea($event)"
    />

    @if (canRepeat() || (canCancel() && cancelable())) {
      <div class="modal-action">
        @if (canRepeat()) {
          <button type="button" class="btn" (click)="repeat.emit(pedido())">Repetir pedido</button>
        }
        @if (canCancel() && cancelable()) {
          <button type="button" class="btn btn-error" (click)="cancelar()">Cancelar pedido</button>
        }
      </div>
    }
  `,
})
export class PedidoDetalle {
  private readonly api = inject(PedidosApi);
  private readonly cancelarPedido = injectCancelarPedido();
  private readonly cancelarLineaPedido = injectCancelarLinea();

  readonly pedido = input.required<Pedido>();
  readonly canManage = input(false);
  /** Separado de canManage: el jugador podrá cancelar sin poder editar (ENCUERDATU-58). */
  readonly canCancel = input(false);
  /** Repetir es crear: solo quien puede crear pedidos. */
  readonly canRepeat = input(false);
  readonly changed = output<Pedido>();
  readonly lineChanged = output<LineaActualizada>();
  readonly repeat = output<Pedido>();

  /** Se sale del modo edición si el detalle pasa a mostrar otro pedido. */
  protected readonly editando = linkedSignal({
    source: () => this.pedido().id,
    computation: () => false,
  });
  protected readonly cancelable = computed(() => pedidoCancelable(this.pedido()));

  protected readonly estado = computed<StatusInfo>(() => LINE_STATUS[this.pedido().estado]);
  protected readonly pago = computed<StatusInfo>(
    () => PAYMENT_STATUS[this.pedido().pago] ?? { label: this.pedido().pago, tone: 'neutral' },
  );

  protected onGuardado(pedido: Pedido): void {
    this.editando.set(false);
    this.changed.emit(pedido);
  }

  protected async cancelar(): Promise<void> {
    const cancelado = await this.cancelarPedido(this.pedido());
    if (cancelado) this.changed.emit(cancelado);
  }

  protected async cancelarLinea(linea: LineaPedido): Promise<void> {
    const actualizada = await this.cancelarLineaPedido(linea);
    if (actualizada) this.lineChanged.emit({ pedidoId: this.pedido().id, linea: actualizada });
  }

  protected async onLinea({ linea, estado, revertir }: CambioLinea): Promise<void> {
    try {
      const actualizada = await firstValueFrom(this.api.changeLineStatus(linea.id, estado));
      this.lineChanged.emit({ pedidoId: this.pedido().id, linea: actualizada });
    } catch {
      revertir(); // El interceptor ya ha mostrado el error
    }
  }
}
