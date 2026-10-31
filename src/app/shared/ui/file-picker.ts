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
      <img class="rounded-box mb-2 size-24 object-cover" alt="Vista previa" [src]="src" />
    }
    <input
      type="file"
      class="file-input w-full"
      [accept]="accept()"
      [attr.aria-label]="label()"
      (change)="onChange($event)"
    />
  `,
})
export class FilePicker {
  readonly label = input.required<string>();
  /** Por ejemplo `image/*` o `.xlsx`. */
  readonly accept = input('');
  /** Imagen que ya existe, para verla hasta que se elija otra. */
  readonly currentImage = input<string | null>(null);
  readonly fileSelected = output<File | null>();

  private readonly preview = signal<string | null>(null);
  protected readonly image = computed(() => this.preview() ?? this.currentImage());

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releasePreview());
  }

  protected onChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.releasePreview();
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
