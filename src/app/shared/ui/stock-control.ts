import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NIVEL_STOCK, NivelStock, nivelStock } from '../models/stock';

// Clases completas: Tailwind no detecta las construidas concatenando
const CLASES: Record<NivelStock, string> = {
  agotado: 'badge-error',
  bajo: 'badge-warning',
  ok: 'badge-ghost',
};

/** − stock + con su aviso. Tonto: solo emite el cambio; quien lo usa decide cómo guardarlo. */
@Component({
  selector: 'app-stock-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-end gap-1">
      <button
        type="button"
        class="btn btn-ghost btn-xs btn-square"
        [disabled]="disabled() || stock() <= 0"
        [attr.aria-label]="'Quitar uno de ' + nombre()"
        (click)="cambio.emit(-1)"
      >
        −
      </button>
      <span
        class="badge min-w-12 tabular-nums"
        [class]="clase()"
        [attr.title]="nivel().label"
        [attr.aria-label]="stock() + ' en stock: ' + nivel().label"
      >
        {{ stock() }}
      </span>
      <button
        type="button"
        class="btn btn-ghost btn-xs btn-square"
        [disabled]="disabled()"
        [attr.aria-label]="'Añadir uno a ' + nombre()"
        (click)="cambio.emit(1)"
      >
        +
      </button>
    </div>
  `,
})
export class StockControl {
  readonly stock = input.required<number>();
  /** Para las etiquetas accesibles: «Añadir uno a RPM Blast». */
  readonly nombre = input.required<string>();
  readonly disabled = input(false);
  readonly cambio = output<number>();

  private readonly nivelActual = computed(() => nivelStock(this.stock()));
  protected readonly nivel = computed(() => NIVEL_STOCK[this.nivelActual()]);
  /** Lo normal no llama la atención: solo se colorea lo que pide reponer. */
  protected readonly clase = computed(() => CLASES[this.nivelActual()]);
}
