import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthStore } from '../core/auth/store/auth.store';
import { MeStore } from '../core/auth/store/me.store';
import { ConfirmService } from '../core/confirm/confirm.service';
import { OfflineState } from '../core/offline/offline-state';
import { OutboxService } from '../core/offline/outbox.service';
import { PrecargaService } from '../core/offline/precarga.service';
import { PwaService } from '../core/pwa/pwa.service';
import { ROLE_LABEL } from '../shared/models/roles';
import { Avatar } from '../shared/ui/avatar';
import { Icon } from '../shared/ui/icon';
import { ThemeToggle } from '../shared/ui/theme-toggle';
import { Campana } from './campana';
import { CambiosPendientes } from './cambios-pendientes';
import { PrecargaEstado } from './precarga-estado';
import { TournamentSwitcher } from './tournament-switcher';

@Component({
  selector: 'app-topbar',
  imports: [
    Avatar,
    Campana,
    CambiosPendientes,
    RouterLink,
    Icon,
    PrecargaEstado,
    ThemeToggle,
    TournamentSwitcher,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="navbar bg-base-100 border-base-300 sticky top-0 z-30 border-b">
      <div class="flex flex-1 items-center gap-2">
        <button
          type="button"
          class="btn btn-ghost btn-square lg:hidden"
          aria-label="Abrir menú"
          (click)="menuToggled.emit()"
        >
          <app-icon name="menu" />
        </button>
        @if (!ocultarSelector()) {
          <app-tournament-switcher />
          <app-precarga-estado />
        }
      </div>

      @if (offline.modoSinConexion()) {
        <button
          type="button"
          class="badge badge-warning mr-1 cursor-pointer"
          title="Pulsa para volver a usar la conexión"
          (click)="offline.setModoSinConexion(false)"
        >
          Sin conexión
        </button>
      }
      <app-cambios-pendientes class="mr-1" />
      @if (conCampana()) {
        <app-campana />
      }
      @if (puedeEscanear()) {
        <a
          routerLink="/escanear"
          class="btn btn-ghost btn-square"
          aria-label="Escanear un QR o código de barras"
          title="Escanear un QR o código de barras"
        >
          <app-icon name="escanear" />
        </a>
      }
      <app-theme-toggle />

      <div class="dropdown dropdown-end">
        <button type="button" class="btn btn-ghost gap-2" aria-label="Menú de usuario">
          <app-avatar [url]="me.imagen()" [nombre]="me.nombre()" size="sm" />
          <span class="hidden sm:inline">{{ auth.username() }}</span>
        </button>
        <ul
          tabindex="-1"
          class="dropdown-content menu bg-base-200 rounded-box z-40 mt-2 w-52 p-2 shadow"
        >
          <li class="menu-title">
            <span class="font-semibold">{{ me.nombre() }}</span>
            <span class="font-normal">{{ roleLabel() }}</span>
          </li>
          <li><a routerLink="/perfil">Mi perfil</a></li>
          <li>
            <label class="flex cursor-pointer justify-between">
              Trabajar sin conexión
              <input
                type="checkbox"
                class="toggle toggle-sm toggle-warning"
                [checked]="offline.modoSinConexion()"
                (change)="onModo($event)"
              />
            </label>
          </li>
          @if (precarga.claveActual() && pwa.conectado() && !offline.modoSinConexion()) {
            <li>
              <button type="button" (click)="precarga.actualizar()">
                Actualizar copia sin conexión
              </button>
            </li>
          }
          @if (pwa.instalable()) {
            <li><button type="button" (click)="pwa.instalar()">Instalar la app</button></li>
          }
          <li><button type="button" (click)="cerrarSesion()">Cerrar sesión</button></li>
        </ul>
      </div>
    </header>
  `,
})
export class Topbar {
  protected readonly auth = inject(AuthStore);
  protected readonly me = inject(MeStore);
  protected readonly pwa = inject(PwaService);
  protected readonly offline = inject(OfflineState);
  protected readonly precarga = inject(PrecargaService);
  private readonly outbox = inject(OutboxService);
  private readonly confirm = inject(ConfirmService);
  readonly menuToggled = output();

  /** El jugador no recibe el tiempo real (el hub no lo admite): no tendría nada que avisar. */
  protected readonly conCampana = computed(
    () => this.auth.isLoggedIn() && !this.auth.hasRole('USER'),
  );

  private readonly router = inject(Router);
  /** Las pantallas de torneos lo piden en su `data`: allí el torneo se elige de la lista. */
  protected readonly ocultarSelector = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let ruta = this.router.routerState.snapshot.root;
        while (ruta.firstChild) ruta = ruta.firstChild;
        return ruta.data['ocultarSelectorTorneo'] === true;
      }),
    ),
    { initialValue: false },
  );

  /** Los mismos roles que la ruta /escanear: el supervisor no ve pedidos. */
  protected readonly puedeEscanear = computed(() =>
    this.auth.hasRole('ADMIN', 'OWNER', 'ENCORDER', 'USER'),
  );

  protected readonly roleLabel = computed(() => {
    const role = this.auth.role();
    return role ? ROLE_LABEL[role] : '';
  });

  /** Cerrar sesión borra lo guardado en el dispositivo, también la cola: que no sea sin querer. */
  protected async cerrarSesion(): Promise<void> {
    const n = this.outbox.operaciones().length;
    if (n) {
      const ok = await this.confirm.ask({
        title: 'Hay cambios sin enviar',
        message: `Tienes ${n} ${n === 1 ? 'cambio' : 'cambios'} sin enviar. Si cierras sesión ahora se perderán.`,
        confirmText: 'Cerrar sesión igualmente',
        cancelText: 'Volver',
        danger: true,
      });
      if (!ok) return;
    }
    this.auth.logout();
  }

  protected onModo(event: Event): void {
    this.offline.setModoSinConexion((event.target as HTMLInputElement).checked);
  }
}
