import { RequiereConexion } from '../../../shared/ui/requiere-conexion';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  FormField,
  FormRoot,
  form,
  maxLength,
  minLength,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { esEmail, esTelefono, opcional } from '../../../shared/utils/validacion';
import { toFormErrors } from '../../../core/http/form-errors';
import { FieldError } from '../../../shared/ui/field-error';
import { FilePicker } from '../../../shared/ui/file-picker';
import { PerfilApi } from '../data-access/api/perfil.api';
import { cambiaUsername, hayCambios, toPerfilFormData } from '../data-access/mapper/perfil.mapper';
import { PerfilActual, PerfilFormValue } from '../data-access/model/perfil.model';

/** Los datos propios y la foto. Solo se envía lo que cambia. */
@Component({
  selector: 'app-perfil-form',
  imports: [RequiereConexion, FormField, FormRoot, FieldError, FilePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formRoot]="form">
      <div class="grid gap-x-6 md:grid-cols-[auto_1fr]">
        <fieldset class="fieldset">
          <span class="fieldset-legend">Foto</span>
          <app-file-picker
            label="Foto de perfil"
            accept="image/*"
            [currentImage]="imagen()"
            [redondo]="true"
            (fileSelected)="avatar.set($event)"
          />
        </fieldset>

        <div class="grid gap-x-4 sm:grid-cols-2">
          <fieldset class="fieldset">
            <label class="fieldset-legend" for="perfil-nombre">Nombre</label>
            <input id="perfil-nombre" class="input w-full" [formField]="form.nombre" />
            <app-field-error [field]="form.nombre" />
          </fieldset>
          <fieldset class="fieldset">
            <label class="fieldset-legend" for="perfil-username">Usuario</label>
            <input id="perfil-username" class="input w-full" [formField]="form.username" />
            <app-field-error [field]="form.username" />
            @if (renombra()) {
              <p class="label text-warning">Al guardar tendrás que volver a entrar con el nuevo.</p>
            }
          </fieldset>
          <fieldset class="fieldset">
            <label class="fieldset-legend" for="perfil-email">Email nuevo</label>
            <input
              id="perfil-email"
              class="input w-full"
              type="email"
              placeholder="Vacío para no cambiarlo"
              [formField]="form.email"
            />
            <app-field-error [field]="form.email" />
          </fieldset>
          <fieldset class="fieldset">
            <label class="fieldset-legend" for="perfil-telefono">Teléfono nuevo</label>
            <input
              id="perfil-telefono"
              class="input w-full"
              type="tel"
              placeholder="Vacío para no cambiarlo"
              [formField]="form.telefono"
            />
            <app-field-error [field]="form.telefono" />
          </fieldset>
          <p class="label sm:col-span-2">
            Por ahora no se pueden ver tu email ni tu teléfono actuales: escribe solo lo que quieras
            cambiar.
          </p>
        </div>
      </div>

      @for (error of form().errors(); track error.kind) {
        <div role="alert" class="alert alert-error alert-soft mt-2">{{ error.message }}</div>
      }

      <div class="mt-4 flex justify-end">
        <button
          appRequiereConexion
          class="btn btn-primary"
          [disabled]="!cambios() || form().submitting()"
        >
          Guardar cambios
        </button>
      </div>
    </form>
  `,
})
export class PerfilForm {
  private readonly api = inject(PerfilApi);

  /** Lo que hay ahora. Al SUPERVISOR solo le llega el username del token (ENCUERDATU-73). */
  readonly actual = input.required<PerfilActual>();
  readonly imagen = input<string | null>(null);
  /** `true` si ha cambiado el username: hay que volver a entrar. */
  readonly saved = output<boolean>();

  protected readonly avatar = signal<File | null>(null);
  protected readonly model = signal<PerfilFormValue>({
    nombre: '',
    username: '',
    email: '',
    telefono: '',
  });

  protected readonly renombra = computed(() => cambiaUsername(this.model(), this.actual()));
  protected readonly cambios = computed(() =>
    hayCambios(this.model(), this.actual(), this.avatar()),
  );

  protected readonly form = form(
    this.model,
    (path) => {
      // Las mismas reglas que el registro (lección 5)
      required(path.username, { message: 'Indica tu usuario' });
      minLength(path.username, 3, { message: 'Entre 3 y 50 caracteres' });
      maxLength(path.username, 50, { message: 'Entre 3 y 50 caracteres' });
      pattern(path.username, /^[a-zA-Z0-9_]+$/, {
        message: 'Solo letras sin tilde, números y guion bajo',
      });
      maxLength(path.nombre, 200, { message: 'No puede superar 200 caracteres' });
      validate(path.email, ({ value }) =>
        opcional(value(), esEmail)
          ? undefined
          : { kind: 'email', message: 'No parece un email válido' },
      );
      validate(path.telefono, ({ value }) => {
        return opcional(value(), esTelefono)
          ? undefined
          : { kind: 'telefono', message: 'Con prefijo y solo números: 34612345678' };
      });
    },
    {
      submission: {
        action: async (field) => {
          const value = field().value();
          try {
            await firstValueFrom(
              this.api.update(toPerfilFormData(value, this.actual(), this.avatar())),
            );
            this.saved.emit(cambiaUsername(value, this.actual()));
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );

  constructor() {
    // Los datos llegan después de abrir la página: se cargan al llegar, sin pisar lo escrito
    effect(() => {
      const { nombre, username } = this.actual();
      untracked(() =>
        this.model.update((value) => ({
          ...value,
          nombre: value.nombre || nombre,
          username: value.username || username,
        })),
      );
    });
  }
}
