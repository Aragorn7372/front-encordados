import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { AvatarAnimado } from '../../core/theme/avatar-animado';

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

/**
 * Las imágenes por defecto que pone el backend llevan «default» en su id de Cloudinary:
 * `avatar-photo-default-user-icon-…_y1hcma` en desarrollo y `usuarios/default` en producción.
 */
export function esFotoPorDefecto(url: string): boolean {
  const ruta = url.split('?')[0];
  const publico = ruta.slice(ruta.lastIndexOf('/', ruta.lastIndexOf('/') - 1) + 1);
  return /default/i.test(publico);
}

// Formas, caras y colores del blob: solo los amables, y colores que se ven en los dos temas.
// Son hex fijos porque blob-avatar los pide así: es una ilustración, no parte del tema.
const FORMAS = [
  'circle',
  'pebble',
  'squircle',
  'cloud',
  'ghost',
  'cat',
  'bear',
  'bunny',
  'heart',
  'star',
  'flower',
  'droplet',
] as const;
const CARAS = [
  'happy',
  'content',
  'curious',
  'wink',
  'proud',
  'dreamy',
  'excited',
  'attentive',
] as const;
const COLORES = [
  '8b5cf6',
  '0ea5e9',
  '10b981',
  'f59e0b',
  'ef4444',
  'ec4899',
  '14b8a6',
  '6366f1',
  '84cc16',
  'f97316',
] as const;

export interface Blob {
  shape: (typeof FORMAS)[number];
  expression: (typeof CARAS)[number];
  color: string;
  seed: string;
}

/** FNV-1a: el mismo nombre da siempre el mismo número, en cualquier navegador. */
function hash(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** El blob de cada persona sale de su nombre: siempre el mismo, en todas las pantallas. */
export function blobDe(nombre: string): Blob {
  const h = hash(nombre.trim().toLowerCase());
  return {
    shape: FORMAS[h % FORMAS.length],
    expression: CARAS[(h >>> 8) % CARAS.length],
    color: COLORES[(h >>> 16) % COLORES.length],
    seed: (h % 2176782336).toString(36).slice(0, 6), // de 1 a 6 caracteres 0-9a-z
  };
}

/** El elemento <blob-avatar> se descarga la primera vez que hace falta, no con la app. */
let carga: Promise<unknown> | undefined;
const cargarBlob = () => (carga ??= import('blob-avatar/element'));

/**
 * Foto del usuario; si no hay o no carga, sus iniciales. Siempre hay algo que ver.
 * Con el avatar animado activado, quien no tiene foto propia (no hay, no carga o es la de
 * por defecto) sale como un blob animado.
 */
@Component({
  selector: 'app-avatar',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <!-- Círculo explícito: daisyUI recorta solo «.avatar > div», y así no depende de ello -->
    <div class="avatar" [class.avatar-placeholder]="!src() && !blob()">
      <div [class]="clase()" [class.overflow-hidden]="!blob()" [class.rounded-full]="!blob()">
        @if (blob(); as b) {
          <blob-avatar
            class="block size-full"
            aria-hidden="true"
            animation="idle.2.4,wink.1.6"
            [attr.shape]="b.shape"
            [attr.expression]="b.expression"
            [attr.color]="b.color"
            [attr.seed]="b.seed"
          ></blob-avatar>
        } @else if (src(); as url) {
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
  private readonly animado = inject(AvatarAnimado);
  private readonly porDefecto = computed(() => {
    const url = this.url();
    return !!url && esFotoPorDefecto(url);
  });
  /** Se ve una foto propia: hay URL, carga y no es la de por defecto. */
  readonly tieneFoto = computed(() => !!this.url() && !this.fallo() && !this.porDefecto());
  protected readonly blob = computed(() =>
    this.animado.activo() && !this.tieneFoto() ? blobDe(this.nombre()) : null,
  );
  protected readonly src = computed(() => {
    const url = this.url();
    return url && !this.fallo() ? miniatura(url, PX[this.size()]) : null;
  });
  protected readonly clase = computed(() => SIZE[this.size()]);
  protected readonly letras = computed(() => iniciales(this.nombre()));

  constructor() {
    effect(() => {
      if (this.blob()) void cargarBlob();
    });
  }
}
