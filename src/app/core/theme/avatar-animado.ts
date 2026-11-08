import { Injectable, effect, signal } from '@angular/core';

const KEY = 'etr_avatar_animado';

/**
 * Preferencia de este dispositivo: dibujar un avatar animado (blob-avatar) en lugar de la foto
 * por defecto o de las iniciales. Solo afecta a quien no tiene foto propia: una foto real
 * siempre se enseña. Se guarda en localStorage como el tema: es del dispositivo, no de la cuenta.
 */
@Injectable({ providedIn: 'root' })
export class AvatarAnimado {
  readonly activo = signal(leer());

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(KEY, this.activo() ? '1' : '0');
      } catch {
        // Sin almacenamiento (modo privado estricto): la preferencia dura lo que la pestaña
      }
    });
  }

  toggle() {
    this.activo.update((activo) => !activo);
  }
}

function leer(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
