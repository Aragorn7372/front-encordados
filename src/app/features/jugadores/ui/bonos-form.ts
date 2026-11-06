import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormField, FormRoot, form, min } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toFormErrors } from '../../../core/http/form-errors';
import { FieldError } from '../../../shared/ui/field-error';
import { JugadoresApi } from '../data-access/api/jugadores.api';
import { Jugador } from '../data-access/model/jugador.model';

/** Añadir bonos: el backend solo suma, así que la cantidad debe ser positiva (ENCUERDATU-64). */
@Component({
  selector: 'app-bonos-form',
  imports: [CurrencyPipe, FormField, FormRoot, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formRoot]="form">
      <p class="mb-2 text-sm">
        Tiene <strong>{{ jugador().bonos | currency: 'EUR' }}</strong> en bonos.
      </p>
      <fieldset class="fieldset">
        <label class="fieldset-legend" for="bonos-cantidad">Cantidad a añadir (€)</label>
        <input
          id="bonos-cantidad"
          class="input w-full"
          type="number"
          step="0.5"
          [formField]="form.cantidad"
        />
        <app-field-error [field]="form.cantidad" />
        @if (model().cantidad > 0) {
          <p class="label">
            Quedará en {{ jugador().bonos + model().cantidad | currency: 'EUR' }}.
          </p>
        }
      </fieldset>

      @for (error of form().errors(); track error.kind) {
        <div role="alert" class="alert alert-error alert-soft mt-2">{{ error.message }}</div>
      }

      <div class="modal-action">
        <button type="button" class="btn" (click)="cancelled.emit()">Cancelar</button>
        <button class="btn btn-primary" [disabled]="form().submitting()">Añadir bonos</button>
      </div>
    </form>
  `,
})
export class BonosForm {
  private readonly api = inject(JugadoresApi);

  readonly jugador = input.required<Jugador>();
  readonly saved = output<number>();
  readonly cancelled = output();

  protected readonly model = signal({ cantidad: 0 });
  protected readonly nuevoTotal = computed(() => this.jugador().bonos + this.model().cantidad);

  protected readonly form = form(
    this.model,
    (path) => {
      min(path.cantidad, 0.01, { message: 'Tiene que ser más de 0' });
    },
    {
      submission: {
        action: async (field) => {
          try {
            await firstValueFrom(this.api.addBonos(this.jugador().id, field().value().cantidad));
            this.saved.emit(this.nuevoTotal());
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );
}
