import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

/** Errores generales del formulario, los que no pertenecen a ningún campo. */
@Component({
  selector: 'app-form-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (error of errors(); track error.kind) {
      <div role="alert" class="alert alert-error alert-soft">{{ error.message }}</div>
    }
  `,
})
export class FormAlert<T> {
  readonly form = input.required<FieldTree<T>>();
  protected readonly errors = computed(() => this.form()().errors());
}
