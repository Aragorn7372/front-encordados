import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { OfflineState } from '../core/offline/offline-state';
import { PrecargaService } from '../core/offline/precarga.service';
import { PwaService } from '../core/pwa/pwa.service';

/** Si lo que se está viendo está guardado para usarlo sin conexión, y si se está guardando. */
@Component({
  selector: 'app-precarga-estado',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (estado(); as e) {
      @switch (e.fase) {
        @case ('guardando') {
          <span class="text-base-content/70 flex items-center gap-1 text-xs" role="status">
            <span class="loading loading-spinner loading-xs"></span>
            <span class="hidden sm:inline">Guardando para sin conexión</span>
            {{ e.hechas }}/{{ e.total }}
          </span>
        }
        @case ('lista') {
          <button
            type="button"
            class="badge badge-success badge-soft badge-sm cursor-pointer"
            [disabled]="!puede()"
            [title]="
              'Guardado el ' +
              (guardadoEn() | date: 'd/M HH:mm') +
              (puede() ? ' · pulsa para actualizar' : '')
            "
            (click)="precarga.actualizar()"
          >
            ✓ <span class="hidden sm:inline">Disponible sin conexión</span>
          </button>
        }
        @case ('incompleta') {
          <button
            type="button"
            class="badge badge-warning badge-soft badge-sm cursor-pointer"
            [disabled]="!puede()"
            [title]="
              'Se guardaron ' +
              e.hechas +
              ' de ' +
              e.total +
              (puede() ? ' · pulsa para reintentar' : '')
            "
            (click)="precarga.actualizar()"
          >
            ⚠ <span class="hidden sm:inline">Copia incompleta</span>
          </button>
        }
      }
    }
  `,
})
export class PrecargaEstado {
  protected readonly precarga = inject(PrecargaService);
  private readonly offline = inject(OfflineState);
  private readonly pwa = inject(PwaService);

  /** Solo el de lo que se ve ahora: el de un torneo anterior no interesa. */
  protected readonly estado = computed(() => {
    const e = this.precarga.estado();
    return e && e.clave === this.precarga.claveActual() ? e : null;
  });
  protected readonly guardadoEn = computed(() => {
    const clave = this.precarga.claveActual();
    return clave ? (this.precarga.guardados()[clave] ?? null) : null;
  });
  protected readonly puede = computed(
    () => !this.offline.modoSinConexion() && this.pwa.conectado(),
  );
}
