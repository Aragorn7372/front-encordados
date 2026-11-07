/**
 * El lector de códigos. La API estándar `BarcodeDetector` donde el navegador la trae con QR y
 * CODE128 (Chrome en Android y macOS); si no (Chrome en Windows, Safari, Firefox), la misma API
 * con ZXing-C++ en WebAssembly (`barcode-detector`). Se carga solo al abrir el escáner.
 */
export interface CodigoDetectado {
  rawValue: string;
  format: string;
}

export interface Detector {
  detect(fuente: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<CodigoDetectado[]>;
}

interface DetectorNativo {
  new (opciones: { formats: string[] }): Detector;
  getSupportedFormats(): Promise<string[]>;
}

/** QR (los nuevos y los del front antiguo) y los de barras más comunes, además del CODE128. */
export const FORMATOS = [
  'qr_code',
  'code_128',
  'code_39',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'data_matrix',
];
const IMPRESCINDIBLES = ['qr_code', 'code_128'];

/** El .wasm lo sirve la app (angular.json) y el service worker lo guarda: funciona sin red. */
const RUTA_WASM = 'zxing/';

let preparado = false;

export async function crearDetector(): Promise<Detector> {
  const nativo = (globalThis as { BarcodeDetector?: DetectorNativo }).BarcodeDetector;
  if (nativo) {
    try {
      const soportados = await nativo.getSupportedFormats();
      if (IMPRESCINDIBLES.every((f) => soportados.includes(f))) {
        return new nativo({ formats: FORMATOS.filter((f) => soportados.includes(f)) });
      }
    } catch {
      // Sin detector nativo útil: el de WebAssembly
    }
  }

  const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');
  if (!preparado) {
    try {
      // Por defecto lo pediría a un CDN: sin red no habría escáner. Se descarga ya (y no en el
      // primer fotograma) para que, si falla, se diga en vez de no leer nada sin explicación
      await prepareZXingModule({
        overrides: {
          locateFile: (path: string, prefix: string) =>
            path.endsWith('.wasm')
              ? new URL(RUTA_WASM + path, document.baseURI).href
              : prefix + path,
        },
        fireImmediately: true,
      });
      preparado = true;
    } catch (error) {
      throw new ErrorLector(error);
    }
  }
  return new BarcodeDetector({ formats: FORMATOS as never[] }) as unknown as Detector;
}

/** El lector de WebAssembly no se ha podido cargar (sin red la primera vez, o no se sirve). */
export class ErrorLector extends Error {
  constructor(readonly causa: unknown) {
    super('No se ha podido cargar el lector de códigos');
  }
}

export const MENSAJE_LECTOR =
  'No se ha podido cargar el lector de códigos. Recarga la página (la primera vez necesita conexión).';

export type ErrorCamara = 'inseguro' | 'sin-camara' | 'denegada' | 'ocupada' | 'otro';

/** Por qué no hay cámara, en palabras del usuario. */
export const MENSAJE_CAMARA: Record<ErrorCamara, string> = {
  inseguro:
    'La cámara en vivo solo funciona con https. Usa «Leer desde una foto», escribe el código o usa un lector.',
  'sin-camara': 'Este dispositivo no tiene cámara. Escribe el código abajo o usa un lector.',
  denegada:
    'No hay permiso para usar la cámara. Dalo en los ajustes del navegador y vuelve a intentarlo.',
  ocupada: 'La cámara está en uso por otra aplicación. Ciérrala y vuelve a intentarlo.',
  otro: 'No se ha podido abrir la cámara. Escribe el código abajo o usa un lector.',
};

export function errorCamara(error: unknown): ErrorCamara {
  if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) return 'inseguro';
  const nombre = (error as { name?: string } | null)?.name;
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError') return 'denegada';
  if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') return 'sin-camara';
  if (nombre === 'NotReadableError') return 'ocupada';
  return 'otro';
}
