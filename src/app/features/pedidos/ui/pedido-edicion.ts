import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormField, FormRoot, form, maxLength, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toFormErrors } from '../../../core/http/form-errors';
import { PAYMENT_STATUS, PaymentStatus } from '../../../shared/models/status';
import { FieldError } from '../../../shared/ui/field-error';
import { Pedido } from '../data-access/model/pedido.model';
import { PedidosApi } from '../data-access/api/pedidos.api';

/**
 * Los campos editables del pedido en modo edición. Se pinta en el mismo sitio y con la misma
 * rejilla que su vista en el detalle, para que al pulsar el lápiz no se mueva nada.
 */
@Component({
  selector: 'app-pedido-edicion',
  imports: [FormField, FormRoot, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm" [formRoot]="form">
      <label class="self-center opacity-60" for="edit-maquina">Máquina</label>
      <div>
        <input id="edit-maquina" class="input input-sm w-full" [formField]="form.maquina" />
        <app-field-error [field]="form.maquina" />
      </div>

      <label class="self-center opacity-60" for="edit-pago">Pago</label>
      <select id="edit-pago" class="select select-sm w-full" [formField]="form.pago">
        @for (opcion of pagos; track opcion.value) {
          <option [value]="opcion.value">{{ opcion.label }}</option>
        }
      </select>

      <label class="col-span-2 opacity-60" for="edit-comentarios">Comentarios</label>
      <div class="col-span-2">
        <textarea
          id="edit-comentarios"
          class="textarea w-full"
          rows="3"
          [formField]="form.comentarios"
        ></textarea>
        <app-field-error [field]="form.comentarios" />
      </div>

      @for (error of form().errors(); track error.kind) {
        <div role="alert" class="alert alert-error alert-soft col-span-2">{{ error.message }}</div>
      }

      <div class="col-span-2 flex justify-end gap-2">
        <button type="button" class="btn btn-ghost btn-sm" (click)="cancelled.emit()">
          Cancelar
        </button>
        <button class="btn btn-primary btn-sm" [disabled]="form().submitting()">
          Guardar cambios
        </button>
      </div>
    </form>
  `,
})
export class PedidoEdicion implements OnInit {
  private readonly api = inject(PedidosApi);

  readonly pedido = input.required<Pedido>();
  readonly saved = output<Pedido>();
  readonly cancelled = output();

  protected readonly pagos = Object.entries(PAYMENT_STATUS).map(([value, info]) => ({
    value,
    label: info.label,
  }));

  private readonly model = signal({ maquina: '', pago: 'PENDING_PAYMENT', comentarios: '' });

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.maquina, { message: 'Indica la máquina' });
      maxLength(path.maquina, 100, { message: 'No puede superar 100 caracteres' });
      maxLength(path.comentarios, 480, { message: 'No puede superar 480 caracteres' });
    },
    {
      submission: {
        action: async (field) => {
          const { maquina, pago, comentarios } = field().value();
          try {
            const actualizado = await firstValueFrom(
              this.api.update(this.pedido(), {
                maquina,
                pago: pago as PaymentStatus,
                comentarios,
              }),
            );
            this.saved.emit(actualizado);
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );

  ngOnInit() {
    const pedido = this.pedido();
    // Signal Forms no crea un campo cuyo valor es undefined: todo debe llegar como string
    this.model.set({
      maquina: pedido.maquina ?? '',
      pago: pedido.pago ?? 'PENDING_PAYMENT',
      comentarios: pedido.comentarios ?? '',
    });
  }
}
