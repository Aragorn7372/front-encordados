import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { EmptyState } from '../../shared/ui/empty-state';
import { PwaService } from '../pwa/pwa.service';
import { OfflineState } from './offline-state';

/**
 * Lo que enseña una pantalla cuando no ha podido cargar sus datos. Si es por falta de
 * conexión y no hay copia guardada, lo dice: «necesitas conexión la primera vez».
 */
@Component({
  selector: 'app-sin-datos',
  imports: [EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (offline.modoSinConexion()) {
      <app-empty-state
        heading="Esto no está guardado en este dispositivo"
        [message]="
          'Estás en modo sin conexión y no hay ' +
          que() +
          ' guardados. Vuelve a usar la conexión para cargarlos.'
        "
      />
      <div class="mt-3 flex justify-center">
        <button type="button" class="btn" (click)="offline.setModoSinConexion(false)">
          Usar la conexión
        </button>
      </div>
    } @else if (sinConexion()) {
      <app-empty-state
        heading="Necesitas conexión para ver esto"
        [message]="
          'Todavía no hay ' +
          que() +
          ' guardados en este dispositivo. Ábrelo una vez con conexión y después podrás verlo sin ella.'
        "
      />
    } @else {
      <app-empty-state [heading]="'No se han podido cargar los ' + que()" [message]="mensaje()" />
    }
  `,
})
export class SinDatos {
  /** En plural y sin artículo: «pedidos», «jugadores»… */
  readonly que = input.required<string>();
  /** Con conexión: el motivo más probable, si la pantalla sabe uno mejor. */
  readonly mensaje = input('Inténtalo de nuevo en unos segundos.');

  private readonly pwa = inject(PwaService);
  protected readonly offline = inject(OfflineState);
  protected readonly sinConexion = computed(
    () => !this.pwa.conectado() || this.offline.sinServidor(),
  );
}
