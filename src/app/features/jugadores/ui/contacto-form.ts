import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import {
  FormField,
  FormRoot,
  form,
  maxLength,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { esEmail, opcional } from '../../../shared/utils/validacion';
import { toFormErrors } from '../../../core/http/form-errors';
import { FieldError } from '../../../shared/ui/field-error';
import { JugadoresEscrituras } from '../data-access/store/jugadores-escrituras';
import { toContactoRequest } from '../data-access/mapper/jugador.mapper';
import { ContactoFormValue } from '../data-access/model/jugador.model';

/** Alta de un jugador como contacto: solo el nombre es obligatorio. */
@Component({
  selector: 'app-contacto-form',
  imports: [FormField, FormRoot, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formRoot]="form">
      <fieldset class="fieldset">
        <label class="fieldset-legend" for="contacto-nombre">Nombre</label>
        <input id="contacto-nombre" class="input w-full" [formField]="form.nombre" />
        <app-field-error [field]="form.nombre" />

        <label class="fieldset-legend" for="contacto-email">Email (opcional)</label>
        <input id="contacto-email" class="input w-full" type="email" [formField]="form.email" />
        <app-field-error [field]="form.email" />
        @if (model().email.trim()) {
          <p class="label">
            Le llegará un email para crear su contraseña y entrar a ver sus pedidos.
          </p>
        }

        <label class="fieldset-legend" for="contacto-telefono">Teléfono (opcional)</label>
        <input id="contacto-telefono" class="input w-full" type="tel" [formField]="form.telefono" />
      </fieldset>

      @for (error of form().errors(); track error.kind) {
        <div role="alert" class="alert alert-error alert-soft mt-2">{{ error.message }}</div>
      }

      <div class="modal-action">
        <button type="button" class="btn" (click)="cancelled.emit()">Cancelar</button>
        <button class="btn btn-primary" [disabled]="form().submitting()">Crear jugador</button>
      </div>
    </form>
  `,
})
export class ContactoForm {
  private readonly escrituras = inject(JugadoresEscrituras);

  readonly tournamentId = input.required<string>();
  /** true: llegó al servidor; false: sin conexión, quedó en la cola. */
  readonly created = output<boolean>();
  readonly cancelled = output();

  protected readonly model = signal<ContactoFormValue>({ nombre: '', email: '', telefono: '' });

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.nombre, { message: 'Indica el nombre' });
      // Mismos límites que ContactoPostRequestDto
      minLength(path.nombre, 3, { message: 'Al menos 3 caracteres' });
      maxLength(path.nombre, 200, { message: 'No puede superar 200 caracteres' });
      validate(path.email, ({ value }) =>
        opcional(value(), esEmail)
          ? undefined
          : { kind: 'email', message: 'No parece un email válido' },
      );
    },
    {
      submission: {
        action: async (field) => {
          try {
            const enviado = await this.escrituras.crearContacto(
              toContactoRequest(field().value(), this.tournamentId()),
            );
            this.created.emit(enviado);
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );
}
