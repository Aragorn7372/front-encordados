import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';

const MODO_KEY = 'etr_sin_conexion';

function modoGuardado(): boolean {
  try {
    return localStorage.getItem(MODO_KEY) === '1';
  } catch {
    return false;
  }
}

function guardarModo(activo: boolean): void {
  try {
    if (activo) localStorage.setItem(MODO_KEY, '1');
    else localStorage.removeItem(MODO_KEY);
  } catch {
    // Sin almacenamiento: el modo dura hasta recargar
  }
}

/**
 * Lo que la interfaz necesita saber del modo offline. No depende de `navigator.onLine`:
 * con poca cobertura el navegador cree tener red y las peticiones no llegan.
 */
@Injectable({ providedIn: 'root' })
export class OfflineState {
  private readonly doc = inject(DOCUMENT);
  /**
   * Elegido por el usuario: no usar la red aunque la haya (cobertura muy mala, ahorrar
   * datos o batería). Las lecturas salen solo de lo guardado y el tiempo real se apaga.
   */
  readonly modoSinConexion = signal(modoGuardado());

  /** El servidor no ha respondido a la última petición (y ninguna ha ido bien desde entonces). */
  readonly sinServidor = signal(false);
  /** Cuándo se guardó la copia más antigua que se está enseñando; null si todo es reciente. */
  readonly copiaDel = signal<number | null>(null);

  readonly usandoCopia = computed(() => this.copiaDel() !== null);

  setModoSinConexion(activo: boolean): void {
    if (!activo) return this.volverAConectar();
    this.modoSinConexion.set(true);
    guardarModo(true);
  }

  /**
   * Lo que se ve son copias: se recarga para pedirlo todo de nuevo al servidor. Con la PWA
   * la app ya está guardada y recargar es casi instantáneo.
   */
  volverAConectar(): void {
    // Guardado ya, no en un effect: la recarga llegaría antes y volvería en modo sin conexión
    guardarModo(false);
    this.modoSinConexion.set(false);
    this.conectado();
    this.doc.defaultView?.location.reload();
  }

  /** Llegó una respuesta del servidor: hay conexión y lo que se ve es actual. */
  conectado(): void {
    this.sinServidor.set(false);
    this.copiaDel.set(null);
  }

  /** Se sirvió una copia guardada: se recuerda la más antigua, que es la que manda. */
  servidaCopia(guardadoEn: number): void {
    this.sinServidor.set(true);
    this.copiaDel.update((actual) => (actual === null ? guardadoEn : Math.min(actual, guardadoEn)));
  }

  sinRed(): void {
    this.sinServidor.set(true);
  }
}
