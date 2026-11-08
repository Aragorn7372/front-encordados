import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type ApexCharts from 'apexcharts';
import type { ApexOptions } from 'apexcharts';

/**
 * Envoltorio mínimo de ApexCharts. La librería se descarga solo al pintar la primera gráfica
 * (`import()`), así no pesa en la carga inicial. Cambiar `options` actualiza la gráfica.
 */
@Component({
  selector: 'app-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <!-- figure y no img: la leyenda de la gráfica se puede pulsar, y un img no admite nada pulsable -->
    <div #lienzo [attr.aria-label]="etiqueta()" role="figure"></div>
    @if (!listo()) {
      <div class="skeleton h-64 w-full"></div>
    }
  `,
})
export class Chart {
  readonly options = input.required<ApexOptions>();
  /** Lo que dice la gráfica, para lectores de pantalla. */
  readonly etiqueta = input.required<string>();

  private readonly lienzo = viewChild.required<ElementRef<HTMLElement>>('lienzo');
  protected readonly listo = signal(false);
  private grafica: ApexCharts | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    let destruido = false;
    destroyRef.onDestroy(() => {
      destruido = true;
      this.grafica?.destroy();
    });

    afterNextRender(async () => {
      const { default: Apex } = await import('apexcharts');
      if (destruido) return;
      this.grafica = new Apex(this.lienzo().nativeElement, this.options());
      await this.grafica.render();
      this.listo.set(true);
    });

    // Datos o tema nuevos: se actualiza la misma gráfica, sin recrearla
    effect(() => {
      const options = this.options();
      if (this.listo()) void this.grafica?.updateOptions(options, true, true);
    });
  }
}
