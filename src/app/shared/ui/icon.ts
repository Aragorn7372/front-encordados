import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Único sitio que conoce los emojis: al pasar a SVG solo cambia este componente. */
const ICONS = {
  pedido: '📦',
  asignados: '🧵',
  terminados: '✅',
  jugadores: '👤',
  cordajes: '🎾',
  materiales: '🧰',
  torneos: '🏆',
  informes: '📊',
  usuarios: '👥',
  menu: '☰',
  editar: '✏️',
  sol: '☀️',
  luna: '🌙',
} as const;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span aria-hidden="true">{{ glyph() }}</span>`,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly glyph = computed(() => ICONS[this.name()]);
}
