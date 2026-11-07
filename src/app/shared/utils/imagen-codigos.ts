import { InjectionToken } from '@angular/core';

/**
 * El QR y el código de barras de un pedido en una sola imagen PNG, sin nada más: para
 * descargarlos o imprimirlos. (La etiqueta con los datos del pedido vendrá al final.)
 * Las librerías se cargan al usarla: no pesan en la carga inicial.
 */
export interface Codigos {
  /** Lo que lleva el QR (ver textoQr). */
  qr: string;
  /** Lo que lleva el código de barras (ver textoBarras). */
  barras: string;
}

/** Quién dibuja la imagen. Un token para que los tests no necesiten un canvas de verdad. */
export const DIBUJAR_CODIGOS = new InjectionToken<(codigos: Codigos) => Promise<Blob>>(
  'DIBUJAR_CODIGOS',
  { factory: () => dibujarCodigos },
);

const ANCHO = 1000;
const MARGEN = 40;
const QR = 560;
/** Lo más alto que puede ser el de barras; normalmente lo limita el ancho. */
const MAX_ALTO_BARRAS = 260;

export async function dibujarCodigos({ qr, barras }: Codigos): Promise<Blob> {
  const [qrcode, { default: JsBarcode }] = await Promise.all([
    import('qrcode'),
    import('jsbarcode'),
  ]);
  // Es CommonJS: según el empaquetador, sus funciones llegan sueltas o dentro de `default`
  const libQr = qrcode.default ?? qrcode;

  // El de barras primero: la imagen mide justo lo que ocupan los dos códigos
  const lienzoBarras = document.createElement('canvas');
  JsBarcode(lienzoBarras, barras, {
    format: 'CODE128',
    width: 4,
    height: 170,
    margin: 0,
    fontSize: 30,
    textMargin: 8,
    background: '#ffffff',
    lineColor: '#000000',
  });
  // A todo lo ancho: cuanto más ancho, más fácil de leer
  const anchoBarras = ANCHO - MARGEN * 2;
  const escala = Math.min(anchoBarras / lienzoBarras.width, MAX_ALTO_BARRAS / lienzoBarras.height);
  const w = lienzoBarras.width * escala;
  const h = lienzoBarras.height * escala;
  const alto = Math.ceil(MARGEN + QR + MARGEN + h + MARGEN);

  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('El navegador no puede dibujar los códigos');

  // Negro sobre blanco siempre: los lectores necesitan contraste, sea cual sea el tema
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ANCHO, alto);

  const lienzoQr = document.createElement('canvas');
  await libQr.toCanvas(lienzoQr, qr, { width: QR, margin: 1, errorCorrectionLevel: 'M' });
  ctx.drawImage(lienzoQr, (ANCHO - QR) / 2, MARGEN, QR, QR);
  ctx.drawImage(lienzoBarras, (ANCHO - w) / 2, MARGEN * 2 + QR, w, h);

  return new Promise((resolve, reject) =>
    lienzo.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Sin imagen'))), 'image/png'),
  );
}
