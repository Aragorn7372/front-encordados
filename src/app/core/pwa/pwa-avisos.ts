import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { OfflineState } from '../offline/offline-state';
import { PwaService } from './pwa.service';

/**
 * Avisos de la PWA, abajo a la izquierda para no tapar los toasts (abajo a la derecha):
 * sin conexión (y de cuándo son los datos que se ven), y versión nueva.
 * Fuera del shell, así también salen en el login.
 */
@Component({
  selector: 'app-pwa-avisos',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast toast-start z-50" aria-live="polite">
      @if (offline.modoSinConexion()) {
        <div role="status" class="alert alert-warning">
          <span>
            <strong>Modo sin conexión.</strong>
            @if (offline.copiaDel(); as fecha) {
              Ves los datos guardados el {{ fecha | date: 'short' }}.
            } @else {
              Ves solo lo que está guardado en este dispositivo.
            }
          </span>
          <button type="button" class="btn btn-sm" (click)="offline.setModoSinConexion(false)">
            Conectar
          </button>
        </div>
      } @else if (sinConexion()) {
        <div role="status" class="alert alert-warning">
          <span>
            <strong>Sin conexión.</strong>
            @if (offline.copiaDel(); as fecha) {
              Ves los datos guardados el {{ fecha | date: 'short' }}.
            } @else {
              Ves lo último que se cargó.
            }
            Lo que hagas en pedidos se guarda y se enviará al recuperarla; el resto necesita
            conexión.
          </span>
        </div>
      }
      @if (pwa.nuevaVersion()) {
        <div role="status" class="alert alert-info">
          <span>Hay una versión nueva de la app.</span>
          <button type="button" class="btn btn-sm" (click)="pwa.actualizar()">Actualizar</button>
        </div>
      }
    </div>
  `,
})
export class PwaAvisos {
  protected readonly pwa = inject(PwaService);
  protected readonly offline = inject(OfflineState);

  /** El navegador sin red, o con «red» pero sin que el servidor conteste (poca cobertura). */
  protected readonly sinConexion = computed(
    () => !this.pwa.conectado() || this.offline.sinServidor(),
  );
}
