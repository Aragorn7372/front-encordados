import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-file-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (image(); as src) {
      <img
        class="mb-2 size-24 object-cover"
        [class.rounded-box]="!redondo()"
        [class.rounded-full]="redondo()"
        alt="Vista previa"
        [src]="src"
      />
    }
    <!-- Botón propio: el del navegador sale en el idioma del navegador («Choose File»).
         El input va dentro con sr-only (no hidden): así se sigue llegando con el teclado -->
    <div class="flex min-w-0 items-center gap-3">
      <label class="btn btn-sm focus-within:outline-primary shrink-0 focus-within:outline-2">
        {{ image() ? 'Cambiar' : 'Elegir archivo' }}
        <input
          type="file"
          class="sr-only"
          [accept]="accept()"
          [attr.aria-label]="label()"
          (change)="onChange($event)"
        />
      </label>
      <span class="truncate text-sm opacity-70" data-testid="nombre-fichero">
        {{ nombre() ?? 'Ningún archivo elegido' }}
      </span>
    </div>
  `,
})
export class FilePicker {
  readonly label = input.required<string>();
  /** Por ejemplo `image/*` o `.xlsx`. */
  readonly accept = input('');
  /** Imagen que ya existe, para verla hasta que se elija otra. */
  readonly currentImage = input<string | null>(null);
  /** Para fotos de perfil: la vista previa con la misma forma que el avatar. */
  readonly redondo = input(false);
  readonly fileSelected = output<File | null>();

  private readonly preview = signal<string | null>(null);
  /** El nombre del fichero elegido, para verlo junto al botón. */
  protected readonly nombre = signal<string | null>(null);
  protected readonly image = computed(() => this.preview() ?? this.currentImage());

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releasePreview());
  }

  protected onChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.releasePreview();
    this.nombre.set(file?.name ?? null);
    if (file?.type.startsWith('image/')) this.preview.set(URL.createObjectURL(file));
    this.fileSelected.emit(file);
  }

  /** Cada URL de objeto retiene el fichero en memoria hasta que se revoca. */
  private releasePreview() {
    const url = this.preview();
    if (url) URL.revokeObjectURL(url);
    this.preview.set(null);
  }
}
