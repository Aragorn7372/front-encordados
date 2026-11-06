import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';

export type AvatarSize = 'xs' | 'sm' | 'md';

// Clases completas: Tailwind no detecta las construidas concatenando
const SIZE: Record<AvatarSize, string> = {
  xs: 'size-6 text-[0.6rem]',
  sm: 'size-8 text-xs',
  md: 'size-12 text-base',
};
const PX: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 48 };

/** Claves de transformación de Cloudinary: así `img_foto` no se toma por una. */
const CLAVES = new Set([
  'a',
  'ar',
  'b',
  'bo',
  'c',
  'co',
  'd',
  'dpr',
  'e',
  'f',
  'fl',
  'g',
  'h',
  'l',
  'o',
  'q',
  'r',
  't',
  'w',
  'x',
  'y',
  'z',
]);

/** Un segmento de transformaciones: `c_fill,f_auto,h_600,q_auto,w_800`. */
const esTransformacion = (segmento: string) =>
  segmento.split(',').every((parte) => {
    const [clave, valor] = parte.split('_');
    return CLAVES.has(clave) && !!valor;
  });

/**
 * El backend da la imagen a 800×600: para un avatar se pide a Cloudinary una miniatura
 * cuadrada centrada en la cara, al doble de resolución por las pantallas retina.
 * Si la URL no es de Cloudinary, se deja tal cual.
 */
export function miniatura(url: string, px: number): string {
  const marca = '/image/upload/';
  const i = url.indexOf(marca);
  if (i < 0) return url;
  const resto = url.slice(i + marca.length);
  const [primero, ...demas] = resto.split('/');
  const publico = esTransformacion(primero) ? demas.join('/') : resto;
  const lado = px * 2;
  return `${url.slice(0, i + marca.length)}c_fill,g_face,f_auto,q_auto,w_${lado},h_${lado}/${publico}`;
}

export function iniciales(nombre: string): string {
  const partes = nombre
    .trim()
    .split(/[\s_.-]+/)
    .filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : (partes[0] ?? '?').slice(0, 2);
  return letras.toUpperCase();
}

/** Foto del usuario; si no hay o no carga, sus iniciales. Siempre hay algo que ver. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <!-- Círculo explícito: daisyUI recorta solo «.avatar > div», y así no depende de ello -->
    <div class="avatar" [class.avatar-placeholder]="!src()">
      <div class="overflow-hidden rounded-full" [class]="clase()">
        @if (src(); as url) {
          <img
            class="size-full rounded-full object-cover"
            [src]="url"
            alt=""
            loading="lazy"
            (error)="fallo.set(true)"
          />
        } @else {
          <span
            class="bg-neutral text-neutral-content flex size-full items-center justify-center rounded-full"
          >
            {{ letras() }}
          </span>
        }
      </div>
    </div>
  `,
})
export class Avatar {
  readonly url = input<string | null | undefined>(null);
  /** Para las iniciales. La imagen es decorativa: el nombre ya está al lado. */
  readonly nombre = input.required<string>();
  readonly size = input<AvatarSize>('sm');

  /** Si cambia la URL, se vuelve a intentar. */
  protected readonly fallo = linkedSignal({ source: this.url, computation: () => false });
  protected readonly src = computed(() => {
    const url = this.url();
    return url && !this.fallo() ? miniatura(url, PX[this.size()]) : null;
  });
  protected readonly clase = computed(() => SIZE[this.size()]);
  protected readonly letras = computed(() => iniciales(this.nombre()));
}
