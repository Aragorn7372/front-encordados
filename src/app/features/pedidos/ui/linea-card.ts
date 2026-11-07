import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LINE_STATUS, PAYMENT_STATUS, StatusInfo } from '../../../shared/models/status';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { esUrgente, lineaCancelable } from '../data-access/mapper/pedido.mapper';
import { Columna, Cordaje, Tarjeta } from '../data-access/model/pedido.model';
import { Avatar } from '../../../shared/ui/avatar';

const SIGUIENTE: Partial<Record<Columna, { columna: Columna; label: string }>> = {
  pendiente: { columna: 'proceso', label: 'Empezar' },
  proceso: { columna: 'listo', label: 'Marcar listo' },
  listo: { columna: 'cerrado', label: 'Entregar' },
};

/**
 * Tono estable (0-359) a partir del id del pedido: el mismo pedido, el mismo color siempre,
 * en cualquier columna y tras recargar. FNV-1a, de sobra para repartir tonos.
 */
export function tonoPedido(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.codePointAt(i) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 360;
}

const cordaje = ({ cuerda, tension, preestirado }: Cordaje) => {
  const texto = `${cuerda} ${tension} kg`;
  return preestirado ? `${texto} +${preestirado} %` : texto;
};

/** Una raqueta (o artículo de taller) del tablero, con lo justo para distinguirla de las demás. */

@Component({
  selector: 'app-linea-card',
  imports: [Avatar, DatePipe, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Franja del color del pedido: separa visualmente pedidos con el mismo nº de raquetas -->
    <article
      class="card bg-base-100 card-sm shadow-sm"
      [class.border-s-4]="color()"
      [style.border-inline-start-color]="color()"
    >
      <div class="card-body">
        <div class="flex items-start justify-between gap-2">
          <h3 class="card-title min-w-0 text-sm">
            <app-avatar size="xs" [url]="tarjeta().pedido.jugador.imageUrl" [nombre]="nombre()" />
            <button type="button" class="link-hover truncate text-left" (click)="opened.emit()">
              {{ nombre() }}
            </button>
          </h3>
          @if (tarjeta().total > 1) {
            <span
              class="badge badge-sm shrink-0"
              data-testid="numero"
              [style.border-color]="color()"
              [style.background-color]="fondo()"
            >
              {{ tarjeta().numero }}/{{ tarjeta().total }}
            </span>
          }
        </div>

        <p class="font-medium">{{ raqueta() }}</p>
        @if (cordajes(); as texto) {
          <p class="text-xs">{{ texto }}</p>
        }

        <div class="flex flex-wrap gap-1">
          <app-status-badge [status]="estado()" />
          <app-status-badge [status]="pago()" />
          @if (logo(); as texto) {
            <span class="badge badge-outline">{{ texto }}</span>
          }
          @if (tarjeta().pedido.tipo === 'taller') {
            <span class="badge badge-outline">Taller</span>
          }
          @if (tarjeta().pedido.materialPropio) {
            <span class="badge badge-outline">Material propio</span>
          }
          @if (urgente()) {
            <span class="badge badge-error">Urgente</span>
          }
          @if (sinEnviar()) {
            <span
              class="badge badge-warning badge-soft"
              data-testid="sin-enviar"
              title="Hecho sin conexión: se enviará al recuperarla"
            >
              Sin enviar
            </span>
          }
        </div>

        <p class="text-xs opacity-70">
          {{ tarjeta().pedido.encordador.name || tarjeta().pedido.encordador.username }}
          @if (tarjeta().pedido.maquina) {
            · {{ tarjeta().pedido.maquina }}
          }
        </p>

        @if (linea().fecha) {
          <p class="text-xs opacity-70">Para el {{ linea().fecha | date: 'short' }}</p>
        }

        @if (!readonly()) {
          <div class="card-actions items-center">
            @if (canRepeat()) {
              <button
                type="button"
                class="btn btn-ghost btn-xs"
                data-testid="repetir"
                [attr.aria-label]="'Repetir el pedido de ' + nombre()"
                (click)="repeat.emit()"
              >
                Repetir
              </button>
            }
            @if (cancelable()) {
              <button
                type="button"
                class="btn btn-ghost btn-xs text-error"
                data-testid="cancelar"
                [attr.aria-label]="'Cancelar ' + raqueta() + ' de ' + nombre()"
                (click)="cancelRequest.emit()"
              >
                Cancelar
              </button>
            }
            @if (siguiente(); as paso) {
              <button
                type="button"
                class="btn btn-xs ms-auto"
                data-testid="siguiente"
                (click)="moved.emit(paso.columna)"
              >
                {{ paso.label }}
              </button>
            }
          </div>
        }
      </div>
    </article>
  `,
})
export class LineaCard {
  readonly tarjeta = input.required<Tarjeta>();
  readonly readonly = input(false);
  /** Solo quien puede crear pedidos (el supervisor no). */
  readonly canRepeat = input(false);
  readonly sinEnviar = input(false);
  /** Alternativa al arrastre: también debe poder usarse con teclado y en móvil. */
  readonly moved = output<Columna>();
  readonly opened = output();
  /** Repite el pedido entero; cancelar, solo esta raqueta. */
  readonly repeat = output();
  readonly cancelRequest = output();

  protected readonly linea = computed(() => this.tarjeta().linea);
  /**
   * Solo si el pedido tiene varias raquetas, que es cuando hay que agruparlas a ojo.
   * Luminosidad y croma medios: se distingue igual sobre el tema claro y el oscuro.
   */
  protected readonly color = computed(() =>
    this.tarjeta().total > 1 ? `oklch(0.65 0.17 ${tonoPedido(this.tarjeta().pedido.id)})` : null,
  );
  /** El badge, con un tinte del color: el texto sigue siendo el del tema y se lee en ambos. */
  protected readonly fondo = computed(() => {
    const color = this.color();
    return color ? `color-mix(in oklab, ${color} 30%, transparent)` : null;
  });
  protected readonly nombre = computed(
    () => this.tarjeta().pedido.jugador.name || this.tarjeta().pedido.jugador.username,
  );
  protected readonly raqueta = computed(() => {
    const linea = this.linea();
    if (linea.tipo === 'encordado') return linea.raqueta;
    return linea.cantidad > 1 ? `${linea.articulo} ×${linea.cantidad}` : linea.articulo;
  });
  /** La horizontal vacía o igual que la vertical no se repite. */
  protected readonly cordajes = computed(() => {
    const linea = this.linea();
    if (linea.tipo !== 'encordado') return '';
    const { vertical, horizontal } = linea;
    const igual =
      !horizontal.cuerda ||
      (horizontal.cuerda === vertical.cuerda &&
        horizontal.tension === vertical.tension &&
        horizontal.preestirado === vertical.preestirado);
    return igual ? cordaje(vertical) : `V: ${cordaje(vertical)} · H: ${cordaje(horizontal)}`;
  });
  protected readonly logo = computed(() => {
    const linea = this.linea();
    if (linea.tipo !== 'encordado' || !linea.logo) return null;
    return linea.color ? `Logo ${linea.color}` : 'Logo';
  });
  protected readonly estado = computed<StatusInfo>(() => LINE_STATUS[this.linea().estado]);
  protected readonly pago = computed<StatusInfo>(() => {
    const pago = this.tarjeta().pedido.pago;
    return PAYMENT_STATUS[pago] ?? { label: pago, tone: 'neutral' };
  });
  protected readonly urgente = computed(() => esUrgente(this.linea()));
  protected readonly cancelable = computed(() => lineaCancelable(this.linea().estado));
  protected readonly siguiente = computed(() =>
    this.readonly() ? undefined : SIGUIENTE[this.tarjeta().columna],
  );
}
