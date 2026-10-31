import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../core/auth/store/auth.store';
import { Icon } from '../shared/ui/icon';
import { buildNav } from './nav';
import { Topbar } from './topbar';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Topbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="drawer lg:drawer-open">
      <input
        id="nav-drawer"
        type="checkbox"
        class="drawer-toggle"
        aria-label="Menú de navegación"
        [checked]="menuOpen()"
        (change)="menuOpen.set(false)"
      />

      <div class="drawer-content flex min-h-dvh flex-col">
        <app-topbar (menuToggled)="menuOpen.set(!menuOpen())" />
        <main class="flex-1 p-4 lg:p-6"><router-outlet /></main>
      </div>

      <div class="drawer-side z-40">
        <label for="nav-drawer" class="drawer-overlay" aria-label="Cerrar menú"></label>
        <nav class="bg-base-200 min-h-full w-64 p-4">
          <p class="mb-4 px-2 text-lg font-bold">Encuerda tu raqueta</p>
          <ul class="menu w-full p-0">
            @for (item of nav(); track item.path) {
              <li>
                <a
                  [routerLink]="item.path"
                  routerLinkActive="menu-active"
                  (click)="menuOpen.set(false)"
                >
                  <app-icon [name]="item.icon" />
                  {{ item.label }}
                </a>
              </li>
            }
          </ul>
        </nav>
      </div>
    </div>
  `,
})
export default class Shell {
  private readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly menuOpen = signal(false);
  protected readonly nav = computed(() =>
    buildNav(this.route.snapshot.routeConfig?.children ?? [], this.auth.role()),
  );
}
