import { Signal, computed, inject } from '@angular/core';
import { PwaService } from '../pwa/pwa.service';
import { OfflineState } from './offline-state';

/**
 * Sin conexión, a efectos de la interfaz: modo «sin conexión» elegido, el navegador sin red, o
 * con red pero sin que el servidor conteste (poca cobertura). Se llama en un contexto de inyección.
 */
export function injectSinConexion(): Signal<boolean> {
  const offline = inject(OfflineState);
  const pwa = inject(PwaService);
  return computed(() => offline.modoSinConexion() || !pwa.conectado() || offline.sinServidor());
}
