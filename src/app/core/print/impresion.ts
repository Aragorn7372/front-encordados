import { DOCUMENT, Injectable, inject } from '@angular/core';

/** Lo único que se ve al imprimir: lo pinta `styles.css` (@media print). */
const ZONA = 'zona-impresion';
const IMPRIMIENDO = 'imprimiendo';

/**
 * Manda algo al diálogo de impresión del navegador sin abrir ventanas ni escribir HTML a mano
 * (el front antiguo hacía `document.write` en un `window.open`). Se pone en una zona propia,
 * el CSS de impresión oculta todo lo demás y al cerrar el diálogo se quita.
 */
@Injectable({ providedIn: 'root' })
export class Impresion {
  private readonly doc = inject(DOCUMENT);

  /** Una imagen (por ejemplo, la etiqueta de un pedido), a lo ancho de la página. */
  async imprimirImagen(url: string, descripcion: string): Promise<void> {
    this.limpiar();
    const zona = this.doc.createElement('div');
    zona.className = ZONA;
    const imagen = this.doc.createElement('img');
    imagen.alt = descripcion;
    zona.append(imagen);
    this.doc.body.append(zona);

    // Se imprime cuando la imagen ya está cargada, o saldría una página en blanco
    await new Promise<void>((resolve, reject) => {
      imagen.onload = () => resolve();
      imagen.onerror = () => reject(new Error('No se ha podido preparar la impresión'));
      imagen.src = url;
    });

    const ventana = this.doc.defaultView;
    this.doc.documentElement.classList.add(IMPRIMIENDO);
    ventana?.addEventListener('afterprint', () => this.limpiar(), { once: true });
    ventana?.print();
  }

  private limpiar(): void {
    this.doc.documentElement.classList.remove(IMPRIMIENDO);
    this.doc.querySelectorAll(`.${ZONA}`).forEach((zona) => zona.remove());
  }
}
