import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../core/auth/store/auth.store';
import { MeStore } from '../core/auth/store/me.store';
import { ROLE_LABEL } from '../shared/models/roles';
import { Avatar } from '../shared/ui/avatar';
import { Icon } from '../shared/ui/icon';
import { ThemeToggle } from '../shared/ui/theme-toggle';
import { TournamentSwitcher } from './tournament-switcher';

@Component({
  selector: 'app-topbar',
  imports: [Avatar, RouterLink, Icon, ThemeToggle, TournamentSwitcher],
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
        <app-tournament-switcher />
      </div>

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
          <li><button type="button" (click)="auth.logout()">Cerrar sesión</button></li>
        </ul>
      </div>
    </header>
  `,
})
export class Topbar {
  protected readonly auth = inject(AuthStore);
  protected readonly me = inject(MeStore);
  readonly menuToggled = output();

  protected readonly roleLabel = computed(() => {
    const role = this.auth.role();
    return role ? ROLE_LABEL[role] : '';
  });
}
