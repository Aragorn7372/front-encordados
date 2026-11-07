import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormField, FormRoot, email, form, minLength, required } from '@angular/forms/signals';
import { toFormErrors } from '../../../core/http/form-errors';
import { FieldError } from '../../../shared/ui/field-error';
import { JugadorOpcion } from '../data-access/api/pedidos.api';
import { PedidosEscrituras } from '../data-access/store/pedidos-escrituras';

/** Formulario propio: anidarlo en el del pedido mezclaría sus validaciones y su envío. */
@Component({
  selector: 'app-contacto-rapido',
  imports: [FormField, FormRoot, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="bg-base-200 rounded-box p-3" [formRoot]="form">
      <p class="mb-2 text-sm font-medium">Nuevo jugador en este torneo</p>
      <div class="grid gap-2 sm:grid-cols-3">
        <div>
          <input
            class="input input-sm w-full"
            placeholder="Nombre"
            aria-label="Nombre del jugador"
            [formField]="form.nombre"
          />
          <app-field-error [field]="form.nombre" />
        </div>
        <input
          class="input input-sm w-full"
          placeholder="Teléfono"
          aria-label="Teléfono del jugador"
          [formField]="form.telefono"
        />
        <div>
          <input
            class="input input-sm w-full"
            placeholder="Email"
            aria-label="Email del jugador"
            [formField]="form.email"
          />
          <app-field-error [field]="form.email" />
        </div>
      </div>
      @for (error of form().errors(); track error.kind) {
        <div role="alert" class="alert alert-error alert-soft mt-2">{{ error.message }}</div>
      }
      <div class="mt-2 flex gap-2">
        <button class="btn btn-primary btn-sm" [disabled]="form().submitting()">
          Crear jugador
        </button>
        <button type="button" class="btn btn-ghost btn-sm" (click)="cancelled.emit()">
          Cancelar
        </button>
      </div>
    </form>
  `,
})
export class ContactoRapido {
  private readonly escrituras = inject(PedidosEscrituras);

  readonly tournamentId = input.required<string>();
  readonly created = output<JugadorOpcion>();
  readonly cancelled = output();

  private readonly model = signal({ nombre: '', telefono: '', email: '' });

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.nombre, { message: 'Escribe el nombre' });
      minLength(path.nombre, 3, { message: 'Al menos 3 caracteres' });
      email(path.email, { message: 'El email no es válido' });
    },
    {
      submission: {
        action: async (field) => {
          const { nombre, telefono, email: correo } = field().value();
          try {
            const jugador = await this.escrituras.crearContacto(
              this.tournamentId(),
              nombre,
              telefono,
              correo,
            );
            this.created.emit(jugador);
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );
}
