import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ConfirmService } from '../core/confirm/confirm.service';
import { Operacion } from '../core/offline/outbox';
import { OutboxService } from '../core/offline/outbox.service';

/**
 * Los cambios hechos sin conexión que aún no han llegado al servidor. Los que el servidor
 * rechazó se quedan aquí para reintentarlos o descartarlos: no se pierden sin avisar.
 */
@Component({
  selector: 'app-cambios-pendientes',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (outbox.operaciones().length) {
      <div class="dropdown dropdown-end">
        <button
          type="button"
          class="badge cursor-pointer gap-1"
          [class]="hayFallidas() ? 'badge-error' : 'badge-warning'"
          aria-label="Cambios sin enviar"
          data-testid="cambios-pendientes"
        >
          @if (outbox.enviando()) {
            <span class="loading loading-spinner loading-xs"></span>
          }
          {{ resumen() }}
        </button>
        <div
          tabindex="-1"
          class="dropdown-content bg-base-200 rounded-box z-40 mt-2 w-80 p-3 shadow"
        >
          <p class="mb-2 text-sm font-semibold">Cambios sin enviar</p>
          <ul class="flex max-h-80 flex-col gap-2 overflow-y-auto">
            @for (op of outbox.operaciones(); track op.id) {
              <li class="bg-base-100 rounded-box p-2 text-sm">
                <p>{{ op.descripcion }}</p>
                <p class="text-xs opacity-60">{{ op.creadaEn | date: 'd/M HH:mm' }}</p>
                @if (op.estado === 'fallida') {
                  <p class="text-error text-xs">No se pudo enviar: {{ op.error }}</p>
                  <div class="mt-1 flex justify-end gap-1">
                    <button type="button" class="btn btn-ghost btn-xs" (click)="descartar(op)">
                      Descartar
                    </button>
                    <button
                      type="button"
                      class="btn btn-xs"
                      [disabled]="!outbox.puede()"
                      (click)="outbox.reintentar(op)"
                    >
                      Reintentar
                    </button>
                  </div>
                }
              </li>
            }
          </ul>
          @if (outbox.pendientes().length) {
            <div class="mt-3 flex items-center justify-between gap-2 text-xs">
              <span class="opacity-70">
                {{
                  outbox.puede() ? 'Se envían en orden.' : 'Se enviarán al recuperar la conexión.'
                }}
              </span>
              <button
                type="button"
                class="btn btn-primary btn-xs"
                [disabled]="!outbox.puede() || outbox.enviando()"
                (click)="outbox.sincronizar()"
              >
                Enviar ahora
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class CambiosPendientes {
  protected readonly outbox = inject(OutboxService);
  private readonly confirm = inject(ConfirmService);

  protected readonly hayFallidas = computed(() => this.outbox.fallidas().length > 0);
  protected readonly resumen = computed(() => {
    const fallidas = this.outbox.fallidas().length;
    const pendientes = this.outbox.pendientes().length;
    const partes = [
      pendientes ? `${pendientes} sin enviar` : '',
      fallidas ? `${fallidas} con error` : '',
    ];
    return partes.filter(Boolean).join(' · ');
  });

  protected async descartar(op: Operacion): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Descartar cambio',
      message: `«${op.descripcion}» no llegará al servidor. Si otros cambios dependen de él, también se descartan.`,
      confirmText: 'Descartar',
      cancelText: 'Volver',
      danger: true,
    });
    if (ok) await this.outbox.descartar(op);
  }
}
