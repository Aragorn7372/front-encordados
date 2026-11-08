import '@aejkatappaja/phantom-ui';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';

/**
 * Una carga más corta no enseña esqueleto: con la copia local los datos llegan casi al momento,
 * y un esqueleto de un instante solo parpadea (y se mezcla con la transición entre páginas).
 */
export const ESPERA_ESQUELETO_MS = 200;

/**
 * Esqueleto de carga con phantom-ui: mide el contenido real que envuelve y dibuja bloques
 * animados encima, con su misma forma. No hay que mantener un segundo diseño "de carga".
 *
 * - Sin datos todavía (primera carga): oculta el contenido y enseña los bloques. Como la lista
 *   está vacía, la página pone dentro un solo bloque (`<tbody app-filas-esqueleto>` o
 *   `.bloque-esqueleto`) para que haya algo que medir.
 * - Con datos, por defecto no hace nada: las páginas enseñan la copia local y la refrescan
 *   contra el servidor en segundo plano, y atenuarlas en cada visita quedaba raro. Con
 *   `[refresco]="true"`, una recarga con datos los deja ver atenuados con un brillo encima y sin
 *   poder pulsarlos (para recargas que pide el usuario y deben notarse).
 *
 * Los colores salen del tema (base-content), así que vale en claro y en oscuro sin tocar nada.
 * Si el sistema pide menos movimiento, phantom-ui deja los bloques quietos.
 *
 * Sin `reveal` (fundido al terminar): los bloques se midieron sobre las filas de ejemplo, y
 * fundiéndose encima del contenido real quedaban descolocados.
 */
@Component({
  selector: 'app-esqueleto',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <phantom-ui
      class="block"
      [attr.loading]="activo() ? '' : null"
      [attr.mode]="hayDatos() ? 'overlay' : 'skeleton'"
      animation="shimmer"
      duration="1.6"
      stagger="0.02"
      loading-label="Cargando"
      shimmer-color="color-mix(in oklab, var(--color-base-content) 12%, transparent)"
      background-color="color-mix(in oklab, var(--color-base-content) 9%, transparent)"
    >
      <ng-content />
    </phantom-ui>
  `,
})
export class Esqueleto {
  readonly cargando = input(false);
  /** Ya hay algo que enseñar: la carga es una recarga. */
  readonly hayDatos = input(false);
  readonly refresco = input(false);

  private readonly pedido = computed(
    () => this.cargando() && (!this.hayDatos() || this.refresco()),
  );
  /** Se enciende tras la espera; se apaga en cuanto termina la carga. */
  protected readonly activo = signal(false);

  constructor() {
    effect((onCleanup) => {
      if (!this.pedido()) {
        this.activo.set(false);
        return;
      }
      const espera = setTimeout(() => this.activo.set(true), ESPERA_ESQUELETO_MS);
      onCleanup(() => clearTimeout(espera));
    });
  }
}

/**
 * Un solo bloque para la primera carga de una tabla, del ancho de la tabla. Mejor que varias filas
 * de ejemplo: esas parecían datos de verdad, y si luego llegaban menos (o ninguna) quedaba raro.
 * Es un `<tbody>` aparte porque una tabla admite varios y así no se mezcla con las filas reales:
 * `@if (cargando && vacia) { <tbody app-filas-esqueleto [columnas]="4"></tbody> }`
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- tiene que ser un <tbody>
  selector: 'tbody[app-filas-esqueleto]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tr>
      <td [attr.colspan]="columnas()">
        <div class="rounded-box h-24 w-full"></div>
      </td>
    </tr>
  `,
})
export class FilasEsqueleto {
  /** Las de la tabla, para que el bloque ocupe todo el ancho. */
  readonly columnas = input.required<number>();
}
