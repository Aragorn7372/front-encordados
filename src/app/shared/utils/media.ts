import { DestroyRef, Signal, inject, signal } from '@angular/core';

/**
 * Signal que dice si se cumple una media query (`(max-width: 767.98px)`…) y se actualiza al
 * girar el móvil o cambiar el tamaño de la ventana. Se llama en un contexto de inyección.
 * Sin matchMedia (los tests en jsdom), es false.
 */
export function mediaQuery(query: string): Signal<boolean> {
  const medida = typeof matchMedia === 'function' ? matchMedia(query) : null;
  const coincide = signal(medida?.matches ?? false);
  if (medida) {
    const cambio = (evento: MediaQueryListEvent) => coincide.set(evento.matches);
    medida.addEventListener('change', cambio);
    inject(DestroyRef).onDestroy(() => medida.removeEventListener('change', cambio));
  }
  return coincide.asReadonly();
}
