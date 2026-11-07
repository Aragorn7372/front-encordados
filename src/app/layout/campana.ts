import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../core/auth/store/auth.store';
import { Notificacion, NotificacionesService } from '../core/realtime/notificaciones.service';
import { rutaPedidosDe } from '../shared/models/rutas-pedidos';
import { Icon } from '../shared/ui/icon';

/** La campana de la barra: lo último que han cambiado los demás en los pedidos. */
@Component({
  selector: 'app-campana',
  imports: [DatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dropdown dropdown-end">
      <button
        type="button"
        class="btn btn-ghost btn-square indicator"
        [attr.aria-label]="etiqueta()"
        [title]="etiqueta()"
        data-testid="campana"
        (click)="notificaciones.marcarLeidas()"
      >
        @if (sinLeer(); as n) {
          <span class="badge badge-error badge-xs indicator-item" aria-hidden="true">
            {{ n > 9 ? '9+' : n }}
          </span>
        }
        <app-icon name="campana" />
      </button>
      <div tabindex="-1" class="dropdown-content bg-base-200 rounded-box z-40 mt-2 w-80 p-2 shadow">
        <div class="flex items-center justify-between px-2 py-1">
          <span class="text-sm font-semibold">Notificaciones</span>
          @if (notificaciones.lista().length) {
            <button type="button" class="btn btn-ghost btn-xs" (click)="notificaciones.borrar()">
              Borrar
            </button>
          }
        </div>
        @if (notificaciones.lista().length) {
          <ul class="menu max-h-96 w-full flex-nowrap overflow-y-auto p-0">
            @for (n of notificaciones.lista(); track n.id) {
              <li>
                <button type="button" class="flex flex-col items-start gap-0" (click)="abrir(n)">
                  <span>{{ n.texto }}</span>
                  <span class="text-xs opacity-60">{{ n.cuando | date: 'd/M HH:mm' }}</span>
                </button>
              </li>
            }
          </ul>
        } @else {
          <p class="px-2 py-4 text-center text-sm opacity-60">
            Aquí verás lo que cambian los demás en tus torneos.
          </p>
        }
      </div>
    </div>
  `,
})
export class Campana {
  protected readonly notificaciones = inject(NotificacionesService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);

  protected readonly sinLeer = computed(() => this.notificaciones.sinLeer());
  protected readonly etiqueta = computed(() => {
    const n = this.sinLeer();
    return n ? `Notificaciones: ${n} sin leer` : 'Notificaciones';
  });

  protected abrir(notificacion: Notificacion): void {
    const ruta = rutaPedidosDe(this.auth.role());
    if (!ruta) return; // El supervisor no ve el detalle de los pedidos
    (document.activeElement as HTMLElement | null)?.blur(); // Cierra el desplegable
    void this.router.navigate([ruta], { queryParams: { openPedido: notificacion.pedidoId } });
  }
}
