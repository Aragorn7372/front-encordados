import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { guardarFichero } from '../../../core/files/download';
import { esTemporal } from '../../../core/offline/outbox';
import { Impresion } from '../../../core/print/impresion';
import { ToastService } from '../../../core/toast/toast.service';
import { textoBarras, textoQr } from '../../../shared/models/codigo-pedido';
import { DIBUJAR_CODIGOS } from '../../../shared/utils/imagen-codigos';
import { Pedido } from '../data-access/model/pedido.model';

/** Para el nombre del fichero: sin acentos, espacios ni símbolos. */
const slug = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

/**
 * El QR y el código de barras de un pedido, para descargarlos o imprimirlos. Los dos llevan el
 * pedido (no la raqueta): da igual desde qué tarjeta se abran. Lo que se ve es lo que se imprime.
 */
@Component({
  selector: 'app-codigos-pedido',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (temporal()) {
      <p class="text-sm opacity-70">
        Tendrá sus códigos cuando llegue al servidor: se creó sin conexión.
      </p>
    } @else {
      <div class="flex flex-col items-center gap-3">
        @if (imagen(); as url) {
          <img
            class="rounded-box border-base-300 w-full max-w-xs border"
            data-testid="codigos-imagen"
            [src]="url"
            [alt]="descripcion()"
          />
        } @else if (fallo()) {
          <p role="alert" class="text-error text-sm">No se han podido generar los códigos.</p>
        } @else {
          <span class="loading loading-spinner" aria-label="Generando los códigos"></span>
        }
        <p class="text-center text-xs opacity-60">
          El QR abre el pedido con la cámara del móvil; el de barras, con el botón de la cámara o un
          lector.
        </p>
        <div class="flex gap-2">
          <button type="button" class="btn btn-sm" [disabled]="!imagen()" (click)="descargar()">
            Descargar
          </button>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            [disabled]="!imagen()"
            (click)="imprimir()"
          >
            Imprimir
          </button>
        </div>
      </div>
    }
  `,
})
export class CodigosPedido {
  private readonly impresion = inject(Impresion);
  private readonly dibujar = inject(DIBUJAR_CODIGOS);
  private readonly toast = inject(ToastService);
  private readonly origen = inject(DOCUMENT).location.origin;

  readonly pedido = input.required<Pedido>();

  protected readonly temporal = computed(() => esTemporal(this.pedido().id));
  protected readonly imagen = signal<string | null>(null);
  protected readonly fallo = signal(false);
  private blob: Blob | null = null;

  private readonly jugador = computed(
    () => this.pedido().jugador.name || this.pedido().jugador.username,
  );
  protected readonly descripcion = computed(
    () => `QR y código de barras del pedido de ${this.jugador()}`,
  );

  constructor() {
    let actual: string | null = null;
    const liberar = () => {
      if (actual) URL.revokeObjectURL(actual);
      actual = null;
    };
    effect((onCleanup) => {
      if (this.temporal()) return;
      const id = this.pedido().id;
      let vigente = true;
      onCleanup(() => (vigente = false));
      this.fallo.set(false);
      this.dibujar({ qr: textoQr(id, this.origen), barras: textoBarras(id) })
        .then((blob) => {
          if (!vigente) return;
          liberar();
          this.blob = blob;
          actual = URL.createObjectURL(blob);
          this.imagen.set(actual);
        })
        .catch(() => vigente && this.fallo.set(true));
    });
    inject(DestroyRef).onDestroy(liberar);
  }

  protected descargar(): void {
    if (!this.blob) return;
    guardarFichero(this.blob, `codigos-${slug(this.jugador()) || 'pedido'}.png`);
  }

  protected imprimir(): void {
    const url = this.imagen();
    if (!url) return;
    this.impresion
      .imprimirImagen(url, this.descripcion())
      .catch(() => this.toast.error('No se ha podido abrir la impresión'));
  }
}
