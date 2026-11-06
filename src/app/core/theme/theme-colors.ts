import { DOCUMENT, Injectable, computed, inject } from '@angular/core';
import { ThemeService } from './theme.service';

export const COLORES = [
  'primary',
  'info',
  'success',
  'warning',
  'error',
  'neutral',
  'base-content',
  'base-300',
] as const;
export type ColorTema = (typeof COLORES)[number];

/**
 * Los colores del tema activo en hexadecimal, para librerías que no entienden las variables
 * CSS de daisyUI (ApexCharts las necesita para sombrear y mezclar). Cambian con el tema.
 */
@Injectable({ providedIn: 'root' })
export class ThemeColors {
  private readonly doc = inject(DOCUMENT);
  private readonly theme = inject(ThemeService);

  readonly colores = computed<Record<ColorTema, string>>(() => {
    // Una sonda con su propio data-theme: no depende de cuándo aplique ThemeService el del <html>
    const sonda = this.doc.createElement('div');
    sonda.setAttribute('data-theme', this.theme.theme());
    sonda.hidden = true;
    this.doc.body.appendChild(sonda);
    const estilo = getComputedStyle(sonda);
    const colores = Object.fromEntries(
      COLORES.map((nombre) => [nombre, aHex(estilo.getPropertyValue(`--color-${nombre}`).trim())]),
    ) as Record<ColorTema, string>;
    sonda.remove();
    return colores;
  });

  readonly oscuro = computed(() => this.theme.theme() === 'black');
}

/**
 * daisyUI define los colores en oklch(). Asignarlo a `fillStyle` no basta: Chrome lo devuelve
 * tal cual. Se pinta un píxel y se lee su RGB, que siempre sale en sRGB.
 * Sin canvas (tests) se devuelve tal cual.
 */
export function aHex(color: string): string {
  if (!color) return '#888888';
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const ctx = canvas?.getContext('2d', { willReadFrequently: true });
  if (!canvas || !ctx) return color;
  canvas.width = canvas.height = 1;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
