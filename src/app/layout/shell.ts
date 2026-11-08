import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../core/auth/store/auth.store';
import { Icon } from '../shared/ui/icon';
import { buildNav } from './nav';
import { Topbar } from './topbar';

const KEY_FIJO = 'etr_menu_fijo';
/** El `lg` de Tailwind: desde aquí hay sitio para tener el menú al lado del contenido. */
const PANTALLA_GRANDE = '(min-width: 1024px)';

/**
 * Menú de hamburguesa en dos modos:
 * - Pantalla grande: fijo al lado del contenido (abierto de inicio). La X lo cierra y la
 *   hamburguesa lo vuelve a abrir; la elección se recuerda en el dispositivo.
 * - Pantalla pequeña: flota encima del contenido y se cierra al navegar, con la X o con Esc.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Topbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Esc cierra el menú flotante desde cualquier sitio de la página (el fijo solo con la X)
  host: { '(document:keydown.escape)': 'menuOpen.set(false)' },
  template: `
    <!-- Clase completa en el código: Tailwind no detecta las construidas -->
    <div class="drawer" [class]="fijoVisible() ? 'lg:drawer-open' : ''">
      <input
        id="nav-drawer"
        type="checkbox"
        class="drawer-toggle"
        aria-label="Menú de navegación"
        [checked]="menuOpen()"
        (change)="menuOpen.set(false)"
      />

      <div class="drawer-content flex min-h-dvh flex-col">
        <app-topbar [menuVisible]="fijoVisible()" (menuToggled)="abrirOCerrar()" />
        <main class="contenido flex-1 p-4 lg:p-6">
          <!-- Ancho máximo: en 2K/4K las tablas se estiraban y las acciones quedaban lejísimos -->
          <div class="mx-auto w-full max-w-[1800px]"><router-outlet /></div>
        </main>
      </div>

      <div class="drawer-side z-40">
        <label for="nav-drawer" class="drawer-overlay" aria-label="Cerrar menú"></label>
        <nav class="bg-base-200 min-h-full w-72 p-4">
          <div class="mb-4 flex items-center gap-2 px-2">
            <img src="icons/icon.svg" alt="" class="size-8 shrink-0" />
            <p class="flex-1 text-lg font-bold whitespace-nowrap">Encuerda tu raqueta</p>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              aria-label="Cerrar menú"
              (click)="cerrar()"
            >
              <app-icon name="cerrar" />
            </button>
          </div>
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

  /** Menú flotante abierto (pantalla pequeña, o grande con el fijo cerrado). */
  protected readonly menuOpen = signal(false);
  /** En pantalla grande, el usuario quiere el menú fijo al lado. */
  protected readonly fijo = signal(leerFijo());
  protected readonly grande = signal(esGrande());
  protected readonly fijoVisible = computed(() => this.grande() && this.fijo());

  protected readonly nav = computed(() =>
    buildNav(this.route.snapshot.routeConfig?.children ?? [], this.auth.role()),
  );

  constructor() {
    const medida = typeof matchMedia === 'function' ? matchMedia(PANTALLA_GRANDE) : null;
    if (medida) {
      const cambio = (e: MediaQueryListEvent) => {
        this.grande.set(e.matches);
        this.menuOpen.set(false);
      };
      medida.addEventListener('change', cambio);
      inject(DestroyRef).onDestroy(() => medida.removeEventListener('change', cambio));
    }
    effect(() => {
      try {
        localStorage.setItem(KEY_FIJO, this.fijo() ? '1' : '0');
      } catch {
        // Sin almacenamiento: la elección dura lo que la pestaña
      }
    });
  }

  protected abrirOCerrar() {
    if (this.grande()) {
      this.fijo.update((fijo) => !fijo);
      this.menuOpen.set(false);
    } else {
      this.menuOpen.update((abierto) => !abierto);
    }
  }

  protected cerrar() {
    if (this.fijoVisible()) this.fijo.set(false);
    this.menuOpen.set(false);
  }
}

function leerFijo(): boolean {
  try {
    return localStorage.getItem(KEY_FIJO) !== '0'; // abierto de inicio
  } catch {
    return true;
  }
}

function esGrande(): boolean {
  return typeof matchMedia === 'function' && matchMedia(PANTALLA_GRANDE).matches;
}
