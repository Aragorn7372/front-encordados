import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { ExcelActions } from '../../../core/excel/excel-actions';
import { ToastService } from '../../../core/toast/toast.service';
import { SinDatos } from '../../../core/offline/sin-datos';
import { EmptyState } from '../../../shared/ui/empty-state';
import { Modal } from '../../../shared/ui/modal';
import { PageHeader } from '../../../shared/ui/page-header';
import { SearchInput } from '../../../shared/ui/search-input';
import { JUGADORES_MAX } from '../data-access/api/jugadores.api';
import { textoContactos } from '../data-access/mapper/jugador.mapper';
import { Jugador } from '../data-access/model/jugador.model';
import { JugadoresStore } from '../data-access/store/jugadores.store';
import { JugadoresEscrituras } from '../data-access/store/jugadores-escrituras';
import { esTemporal } from '../../../core/offline/outbox';
import { BonosForm } from '../ui/bonos-form';
import { ContactoForm } from '../ui/contacto-form';
import { JugadorEdicion } from '../ui/jugador-edicion';
import { Avatar } from '../../../shared/ui/avatar';
import { Esqueleto, FilasEsqueleto } from '../../../shared/ui/esqueleto';

/** Lo que hay abierto en el modal. Uno solo para las tres acciones. */
type Accion =
  { tipo: 'nuevo' } | { tipo: 'bonos'; jugador: Jugador } | { tipo: 'editar'; jugador: Jugador };

const TITULOS: Record<Accion['tipo'], string> = {
  nuevo: 'Nuevo jugador',
  bonos: 'Añadir bonos',
  editar: 'Editar jugador',
};

/**
 * Los jugadores (contactos) del torneo activo. Lo que cada rol puede hacer lo marca el backend:
 * ENCORDER crea; OWNER además bonos y Excel; ADMIN además edita y borra.
 */

@Component({
  selector: 'app-jugadores-page',
  imports: [
    Esqueleto,
    FilasEsqueleto,
    SinDatos,
    Avatar,
    BonosForm,
    ContactoForm,
    CurrencyPipe,
    EmptyState,
    ExcelActions,
    JugadorEdicion,
    Modal,
    PageHeader,
    SearchInput,
  ],
  providers: [JugadoresStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header heading="Jugadores">
      @if (puedeExcel()) {
        <app-excel-actions
          [tournamentId]="store.tournamentId()"
          [tipos]="['users']"
          nombre="jugadores.xlsx"
          (importado)="store.reload()"
        />
      }
      <button
        type="button"
        class="btn btn-primary"
        [disabled]="!store.tournamentId()"
        (click)="accion.set({ tipo: 'nuevo' })"
      >
        Nuevo jugador
      </button>
    </app-page-header>

    @if (!store.tournamentId()) {
      <app-empty-state
        heading="Selecciona un torneo"
        message="Los jugadores son de cada torneo: elige uno en la barra superior."
      />
    } @else {
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <div class="w-full max-w-sm">
          <app-search-input
            placeholder="Buscar por nombre o email…"
            (searched)="store.busqueda.set($event)"
          />
        </div>
        <button
          type="button"
          class="btn btn-ghost"
          [disabled]="store.jugadores().length === 0"
          (click)="copiar()"
        >
          Copiar contactos
        </button>
        <span class="text-sm opacity-60" role="status">
          {{ store.jugadores().length }} de {{ store.todos().length }}
        </span>
      </div>

      @if (store.total() > limite) {
        <div role="status" class="alert alert-warning alert-soft mb-4">
          Se muestran los {{ limite }} primeros de {{ store.total() }} jugadores.
        </div>
      }

      @if (store.failed()) {
        <app-sin-datos que="jugadores" />
      } @else if (store.todos().length === 0 && !store.loading()) {
        <app-empty-state
          heading="Este torneo aún no tiene jugadores"
          message="Créalos con «Nuevo jugador» o desde el formulario de un pedido."
        />
      } @else {
        <app-esqueleto [cargando]="store.loading()" [hayDatos]="store.jugadores().length > 0">
          <div class="overflow-x-auto">
            <table class="table">
              <!-- data-shimmer-ignore: las cabeceras se ven mientras carga -->
              <thead data-shimmer-ignore>
                <tr>
                  <th>Jugador</th>
                  <th>Email</th>
                  <th class="text-right">Bonos</th>
                  <th><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (jugador of store.jugadores(); track jugador.id) {
                  <tr>
                    <td>
                      <div class="flex items-center gap-3">
                        <app-avatar [url]="jugador.imagen" [nombre]="jugador.nombre" />
                        <div>
                          <div class="font-medium">
                            {{ jugador.nombre }}
                            @if (store.sinEnviar().has(jugador.id)) {
                              <span
                                class="badge badge-warning badge-soft badge-sm ml-1"
                                title="Hecho sin conexión: se enviará al recuperarla"
                              >
                                Sin enviar
                              </span>
                            }
                          </div>
                          @if (jugador.username) {
                            <div class="text-xs opacity-60">{{ jugador.username }}</div>
                          }
                        </div>
                      </div>
                    </td>
                    <td>
                      @if (jugador.email) {
                        {{ jugador.email }}
                      } @else {
                        <span class="opacity-50">Sin email</span>
                      }
                    </td>
                    <td class="text-right tabular-nums">{{ jugador.bonos | currency: 'EUR' }}</td>
                    <td class="text-right whitespace-nowrap">
                      @if (esTemporal(jugador.id)) {
                        <!-- Aún no existe en el servidor: no tiene id con el que editarlo -->
                        <span class="text-xs opacity-60">Al enviarse podrás editarlo</span>
                      } @else {
                        @if (puedeBonos()) {
                          <button
                            type="button"
                            class="btn btn-ghost btn-xs"
                            [attr.aria-label]="'Añadir bonos a ' + jugador.nombre"
                            (click)="accion.set({ tipo: 'bonos', jugador })"
                          >
                            + Bonos
                          </button>
                        }
                        @if (esAdmin()) {
                          <button
                            type="button"
                            class="btn btn-ghost btn-xs"
                            [attr.aria-label]="'Editar a ' + jugador.nombre"
                            (click)="accion.set({ tipo: 'editar', jugador })"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            class="btn btn-ghost btn-xs text-error"
                            [attr.aria-label]="'Borrar a ' + jugador.nombre"
                            (click)="borrar(jugador)"
                          >
                            Borrar
                          </button>
                        }
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="py-6 text-center opacity-60">
                      Ningún jugador coincide con la búsqueda.
                    </td>
                  </tr>
                }
              </tbody>
              @if (store.loading() && store.jugadores().length === 0) {
                <tbody app-filas-esqueleto [columnas]="4"></tbody>
              }
            </table>
          </div>
        </app-esqueleto>
      }
    }

    <app-modal [heading]="titulo()" [open]="!!accion()" (closed)="accion.set(null)">
      <!-- ng-content no es perezoso: cada formulario debe nacer al abrirse -->
      @switch (accion()?.tipo) {
        @case ('nuevo') {
          @if (store.tournamentId(); as torneo) {
            <app-contacto-form
              [tournamentId]="torneo"
              (created)="terminar('Jugador creado', $event)"
              (cancelled)="accion.set(null)"
            />
          }
        }
        @case ('bonos') {
          <app-bonos-form
            [jugador]="jugadorAbierto()!"
            (saved)="terminar('Bonos añadidos', $event)"
            (cancelled)="accion.set(null)"
          />
        }
        @case ('editar') {
          <app-jugador-edicion
            [jugador]="jugadorAbierto()!"
            (saved)="terminar('Jugador actualizado', $event)"
            (cancelled)="accion.set(null)"
          />
        }
      }
    </app-modal>
  `,
})
export default class JugadoresPage {
  protected readonly store = inject(JugadoresStore);
  private readonly auth = inject(AuthStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly escrituras = inject(JugadoresEscrituras);

  protected readonly limite = JUGADORES_MAX;
  protected readonly accion = signal<Accion | null>(null);
  protected readonly titulo = computed(() => {
    const accion = this.accion();
    return accion ? TITULOS[accion.tipo] : '';
  });
  protected readonly jugadorAbierto = computed(() => {
    const accion = this.accion();
    return accion && accion.tipo !== 'nuevo' ? accion.jugador : null;
  });

  /** Lo que el backend permite a cada rol (ENCUERDATU-64, -65). */
  protected readonly puedeBonos = computed(() => this.auth.hasRole('ADMIN', 'OWNER'));
  protected readonly puedeExcel = computed(() => this.auth.hasRole('ADMIN', 'OWNER'));
  protected readonly esAdmin = computed(() => this.auth.hasRole('ADMIN'));
  protected readonly esTemporal = esTemporal;

  /** `enviado` false: sin conexión, está en la cola (y ya se ve en la lista). */
  protected terminar(mensaje: string, enviado: boolean): void {
    this.accion.set(null);
    if (!enviado) {
      this.toast.warning('Sin conexión: se ha guardado y se enviará al recuperarla');
      return;
    }
    this.toast.success(mensaje);
    this.store.reload();
  }

  protected async copiar(): Promise<void> {
    const jugadores = this.store.jugadores();
    try {
      await navigator.clipboard.writeText(textoContactos(jugadores));
      this.toast.success(`${jugadores.length} contactos copiados`);
    } catch {
      this.toast.error('No se ha podido copiar: el navegador no lo permite');
    }
  }

  protected async borrar(jugador: Jugador): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Borrar jugador',
      message: `¿Borrar a ${jugador.nombre}? Dejará de aparecer en el torneo.`,
      confirmText: 'Borrar',
      cancelText: 'Volver',
      danger: true,
    });
    if (!ok) return;
    try {
      if (await this.escrituras.borrar(jugador)) {
        this.toast.success('Jugador borrado');
        this.store.reload();
      }
    } catch {
      // Ya se ha avisado del error
    }
  }
}
