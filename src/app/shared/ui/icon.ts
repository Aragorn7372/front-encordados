import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
} from '@angular/core';
import {
  ArrowLeft,
  Bell,
  ChartColumn,
  Check,
  CircleCheck,
  ClipboardList,
  Menu,
  Moon,
  Package,
  Pencil,
  QrCode,
  ScanQrCode,
  Spool,
  Sun,
  Toolbox,
  TriangleExclamationPoint,
  Trophy,
  User,
  Users,
  X,
  createElement,
  type IconNode,
} from 'lucide';

/**
 * Único sitio que sabe qué dibujo lleva cada icono: las páginas solo usan el nombre.
 * Los dibujos son de Lucide (licencia ISC). Se importan uno a uno, así al bundle solo
 * llegan los que están aquí (el paquete entero no).
 */
const ICONS = {
  pedido: Package,
  asignados: ClipboardList,
  terminados: CircleCheck,
  jugadores: User,
  cordajes: Spool,
  materiales: Toolbox,
  torneos: Trophy,
  informes: ChartColumn,
  usuarios: Users,
  escanear: ScanQrCode,
  codigos: QrCode,
  campana: Bell,
  menu: Menu,
  editar: Pencil,
  sol: Sun,
  luna: Moon,
  cerrar: X,
  hecho: Check,
  aviso: TriangleExclamationPoint,
  volver: ArrowLeft,
} satisfies Record<string, IconNode>;

export type IconName = keyof typeof ICONS;

/**
 * Icono SVG con trazo `currentColor`: toma el color del texto que lo rodea, así cambia solo
 * con el tema y con las clases de daisyUI (btn-primary, text-error…). Mide 1.25em: crece
 * con el tamaño de letra igual que hacían los emojis.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0 items-center', 'aria-hidden': 'true' },
  template: '',
})
export class Icon {
  readonly name = input.required<IconName>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    // El SVG se crea con la API del DOM: el sanitizador de Angular quitaría un <svg> puesto
    // con [innerHTML], y una plantilla tendría que conocer cada tipo de elemento (path, circle…)
    effect(() => {
      this.host.replaceChildren(
        createElement(ICONS[this.name()], { width: '1.25em', height: '1.25em', 'stroke-width': 2 }),
      );
    });
  }
}
