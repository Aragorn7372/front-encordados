import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

/** Muestra los errores de un campo, solo cuando el usuario ya ha pasado por él. */
@Component({
  selector: 'app-field-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (error of errors(); track error.kind) {
      <p class="label text-error">{{ error.message }}</p>
    }
  `,
})
export class FieldError<T> {
  readonly field = input.required<FieldTree<T>>();

  protected readonly errors = computed(() => {
    const state = this.field()();
    return state.touched() ? state.errors() : [];
  });
}
