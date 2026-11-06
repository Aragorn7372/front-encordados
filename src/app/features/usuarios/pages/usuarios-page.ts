import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ROLE_LABEL } from '../../../shared/models/roles';
import { EmptyState } from '../../../shared/ui/empty-state';
import { Modal } from '../../../shared/ui/modal';
import { PageHeader } from '../../../shared/ui/page-header';
import { SearchInput } from '../../../shared/ui/search-input';
import { USUARIOS_MAX } from '../data-access/api/usuarios.api';
import { esSinRol, grupoDe } from '../data-access/mapper/usuario.mapper';
import { GRUPO_LABEL, Grupo, Usuario } from '../data-access/model/usuario.model';
import { UsuariosStore } from '../data-access/store/usuarios.store';
import { BackupPanel } from '../ui/backup-panel';
import { RolForm } from '../ui/rol-form';
import { Avatar } from '../../../shared/ui/avatar';

/**
 * Cuentas y roles. Quien se registra a mano llega «sin rol» y espera a que se le dé uno:
 * el ADMIN puede darle cualquiera; el OWNER, hacerle encordador. Los jugadores, en /jugadores.
 */

@Component({
  selector: 'app-usuarios-page',
  imports: [Avatar, BackupPanel, EmptyState, Modal, PageHeader, RolForm, RouterLink, SearchInput],
  providers: [UsuariosStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header heading="Usuarios" subtitle="Cuentas, roles y equipo de los torneos" />

    @if (store.sinRol(); as cuantos) {
      <div role="status" class="alert alert-info alert-soft mb-4">
        {{ cuantos }} {{ cuantos === 1 ? 'cuenta espera' : 'cuentas esperan' }} a que se le dé un
        rol.
        <button type="button" class="btn btn-sm" (click)="store.grupo.set('sin-rol')">
          Ver cuáles
        </button>
      </div>
    }

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <div class="w-full max-w-sm">
        <app-search-input
          placeholder="Buscar por nombre, usuario o email…"
          (searched)="store.busqueda.set($event)"
        />
      </div>
      <select class="select w-auto" aria-label="Filtrar por grupo" (change)="onGrupo($event)">
        <option value="" [selected]="!store.grupo()">Todos</option>
        @for (grupo of store.grupos(); track grupo) {
          <option [value]="grupo" [selected]="store.grupo() === grupo">
            {{ grupoLabel[grupo] }}
          </option>
        }
      </select>
      <a routerLink="/torneos" class="btn btn-ghost">Asignar a un torneo</a>
    </div>

    @if (store.total() > limite) {
      <div role="status" class="alert alert-warning alert-soft mb-4">
        Se muestran los {{ limite }} primeros de {{ store.total() }} usuarios.
      </div>
    }

    @if (store.failed()) {
      <app-empty-state
        heading="No se han podido cargar los usuarios"
        message="Inténtalo de nuevo en unos segundos."
      />
    } @else {
      <div class="overflow-x-auto" [attr.aria-busy]="store.loading()">
        <table class="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (usuario of store.usuarios(); track usuario.id) {
              <tr>
                <td>
                  <div class="flex items-center gap-3">
                    <app-avatar [url]="usuario.imagen" [nombre]="usuario.nombre" />
                    <div>
                      <div class="font-medium">{{ usuario.nombre }}</div>
                      @if (usuario.username) {
                        <div class="text-xs opacity-60">{{ usuario.username }}</div>
                      }
                    </div>
                  </div>
                </td>
                <td>
                  @if (usuario.email) {
                    {{ usuario.email }}
                  } @else {
                    <span class="opacity-50">Sin email</span>
                  }
                </td>
                <td>
                  @if (sinRol(usuario)) {
                    <span class="badge badge-info badge-soft">Sin rol</span>
                  } @else if (usuario.rol) {
                    <span class="badge badge-ghost">{{ rolLabel[usuario.rol] }}</span>
                  }
                </td>
                <td class="text-right whitespace-nowrap">
                  @if (sinRol(usuario)) {
                    @if (esAdmin()) {
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs"
                        [attr.aria-label]="'Dar rol a ' + usuario.nombre"
                        (click)="dandoRol.set(usuario)"
                      >
                        Dar rol
                      </button>
                    } @else {
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs"
                        [attr.aria-label]="'Hacer encordador a ' + usuario.nombre"
                        (click)="hacerEncordador(usuario)"
                      >
                        Hacer encordador
                      </button>
                    }
                  }
                  @if (grupoDe(usuario) === 'jugadores') {
                    <a routerLink="/jugadores" class="btn btn-ghost btn-xs">Ver en jugadores</a>
                  }
                  @if (esAdmin() && usuario.id !== miId()) {
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs text-error"
                      [attr.aria-label]="'Borrar a ' + usuario.nombre"
                      (click)="borrar(usuario)"
                    >
                      Borrar
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="py-6 text-center opacity-60">
                  @if (store.loading()) {
                    Cargando…
                  } @else {
                    Ningún usuario coincide con los filtros.
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (esAdmin()) {
      <app-backup-panel />
    }

    <app-modal heading="Dar rol" [open]="!!dandoRol()" (closed)="dandoRol.set(null)">
      @if (dandoRol(); as usuario) {
        <app-rol-form
          [usuario]="usuario"
          (saved)="onRol(usuario, $event)"
          (cancelled)="dandoRol.set(null)"
        />
      }
    </app-modal>
  `,
})
export default class UsuariosPage {
  protected readonly store = inject(UsuariosStore);
  private readonly auth = inject(AuthStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly grupoLabel = GRUPO_LABEL;
  protected readonly rolLabel = ROLE_LABEL;
  protected readonly limite = USUARIOS_MAX;
  protected readonly grupoDe = grupoDe;
  protected readonly sinRol = esSinRol;
  protected readonly dandoRol = signal<Usuario | null>(null);
  protected readonly esAdmin = computed(() => this.auth.hasRole('ADMIN'));
  /** Nadie se borra a sí mismo desde aquí. */
  protected readonly miId = computed(() => this.auth.userId());

  protected onGrupo(event: Event): void {
    this.store.grupo.set((event.target as HTMLSelectElement).value as Grupo | '');
  }

  protected onRol(usuario: Usuario, rol: keyof typeof ROLE_LABEL): void {
    this.dandoRol.set(null);
    this.toast.success(`${usuario.nombre} ya es ${ROLE_LABEL[rol].toLowerCase()}`);
    this.store.reload();
  }

  protected async hacerEncordador(usuario: Usuario): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Hacer encordador',
      message: `¿Dar a ${usuario.nombre} el rol de encordador? Ahora mismo no se puede deshacer. Después, añádelo a un torneo desde Torneos.`,
      confirmText: 'Hacer encordador',
      cancelText: 'Volver',
    });
    if (!ok) return;
    try {
      await this.store.hacerEncordador(usuario.id);
      this.toast.success(`${usuario.nombre} ya es encordador`);
    } catch {
      // El interceptor ya ha mostrado el error
    }
  }

  protected async borrar(usuario: Usuario): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Borrar usuario',
      message: `¿Borrar la cuenta de ${usuario.nombre}? No podrá volver a entrar.`,
      confirmText: 'Borrar',
      cancelText: 'Volver',
      danger: true,
    });
    if (!ok) return;
    try {
      await this.store.remove(usuario.id);
      this.toast.success('Usuario borrado');
    } catch {
      // El interceptor ya ha mostrado el error
    }
  }
}
