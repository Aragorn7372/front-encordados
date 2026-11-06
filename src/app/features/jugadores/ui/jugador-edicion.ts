import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormField, FormRoot, form, minLength, required, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toFormErrors } from '../../../core/http/form-errors';
import { FieldError } from '../../../shared/ui/field-error';
import { JugadoresApi } from '../data-access/api/jugadores.api';
import { Jugador, JugadorEdicionValue } from '../data-access/model/jugador.model';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** La misma regla que UserRequestDto: con prefijo, sin el +. Se aceptan espacios y guiones. */
const TELEFONO = /^[1-9]\d{6,14}$/;

/** Edición de un jugador. Solo ADMIN: el backend no deja a nadie más (ENCUERDATU-65). */
@Component({
  selector: 'app-jugador-edicion',
  imports: [FormField, FormRoot, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formRoot]="form">
      <fieldset class="fieldset">
        <label class="fieldset-legend" for="jugador-nombre">Nombre</label>
        <input id="jugador-nombre" class="input w-full" [formField]="form.nombre" />
        <app-field-error [field]="form.nombre" />

        <label class="fieldset-legend" for="jugador-email">Email</label>
        <input id="jugador-email" class="input w-full" type="email" [formField]="form.email" />
        <app-field-error [field]="form.email" />

        <label class="fieldset-legend" for="jugador-telefono">Teléfono nuevo</label>
        <input
          id="jugador-telefono"
          class="input w-full"
          type="tel"
          placeholder="Vacío para no cambiarlo"
          [formField]="form.telefono"
        />
        <app-field-error [field]="form.telefono" />
        <p class="label">El actual no se puede ver todavía. Con prefijo: 34612345678.</p>
      </fieldset>

      @for (error of form().errors(); track error.kind) {
        <div role="alert" class="alert alert-error alert-soft mt-2">{{ error.message }}</div>
      }

      <div class="modal-action">
        <button type="button" class="btn" (click)="cancelled.emit()">Cancelar</button>
        <button class="btn btn-primary" [disabled]="form().submitting()">Guardar cambios</button>
      </div>
    </form>
  `,
})
export class JugadorEdicion implements OnInit {
  private readonly api = inject(JugadoresApi);

  readonly jugador = input.required<Jugador>();
  readonly saved = output();
  readonly cancelled = output();

  private readonly model = signal<JugadorEdicionValue>({ nombre: '', email: '', telefono: '' });

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.nombre, { message: 'Indica el nombre' });
      minLength(path.nombre, 3, { message: 'Al menos 3 caracteres' });
      validate(path.email, ({ value }) =>
        !value().trim() || EMAIL.test(value().trim())
          ? undefined
          : { kind: 'email', message: 'No parece un email válido' },
      );
      validate(path.telefono, ({ value }) => {
        const limpio = value().replace(/[\s\-+]/g, '');
        return !limpio || TELEFONO.test(limpio)
          ? undefined
          : { kind: 'telefono', message: 'Con prefijo y solo números: 34612345678' };
      });
    },
    {
      submission: {
        action: async (field) => {
          try {
            await firstValueFrom(this.api.update(this.jugador().id, field().value()));
            this.saved.emit();
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );

  ngOnInit() {
    const { nombre, email } = this.jugador();
    // Signal Forms no crea un campo cuyo valor es undefined: todo debe llegar como string
    this.model.set({ nombre, email: email ?? '', telefono: '' });
  }
}
