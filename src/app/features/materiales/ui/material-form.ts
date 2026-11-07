import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormField, FormRoot, form, maxLength, min, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toFormErrors } from '../../../core/http/form-errors';
import { FieldError } from '../../../shared/ui/field-error';
import { FilePicker } from '../../../shared/ui/file-picker';
import { MaterialesApi } from '../data-access/api/materiales.api';
import { MaterialesEscrituras } from '../data-access/store/materiales-escrituras';
import { TIPOS_MATERIAL } from '../data-access/dto/material.dto';
import { toMaterialFormValue } from '../data-access/mapper/material.mapper';
import {
  Material,
  MaterialFormValue,
  TIPO_MATERIAL_LABEL,
} from '../data-access/model/material.model';

/** La imagen va aparte: un File no es un campo que validar. */
type Campos = Omit<MaterialFormValue, 'imagen'>;

/** Crear (sin `material`) o editar un material. */
@Component({
  selector: 'app-material-form',
  imports: [FormField, FormRoot, FieldError, FilePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formRoot]="form">
      <div class="grid gap-x-4 sm:grid-cols-2">
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="material-marca">Marca</label>
          <input id="material-marca" class="input w-full" [formField]="form.marca" />
          <app-field-error [field]="form.marca" />
        </fieldset>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="material-modelo">Modelo</label>
          <input id="material-modelo" class="input w-full" [formField]="form.modelo" />
          <app-field-error [field]="form.modelo" />
        </fieldset>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="material-tipo">Tipo</label>
          <select id="material-tipo" class="select w-full" [formField]="form.tipo">
            @for (tipo of tipos; track tipo) {
              <option [value]="tipo">{{ tipoLabel[tipo] }}</option>
            }
          </select>
        </fieldset>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="material-precio">Precio (€)</label>
          <input
            id="material-precio"
            class="input w-full"
            type="number"
            step="0.01"
            [formField]="form.precio"
          />
          <app-field-error [field]="form.precio" />
        </fieldset>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="material-stock">Stock</label>
          <input id="material-stock" class="input w-full" type="number" [formField]="form.stock" />
          <app-field-error [field]="form.stock" />
        </fieldset>
        <fieldset class="fieldset">
          <span class="fieldset-legend">Imagen</span>
          <app-file-picker
            label="Imagen del material"
            accept="image/*"
            [currentImage]="material()?.imagen ?? null"
            (fileSelected)="imagen.set($event)"
          />
        </fieldset>
      </div>

      @for (error of form().errors(); track error.kind) {
        <div role="alert" class="alert alert-error alert-soft mt-2">{{ error.message }}</div>
      }

      <div class="modal-action">
        <button type="button" class="btn" (click)="cancelled.emit()">Cancelar</button>
        <button class="btn btn-primary" [disabled]="form().submitting()">
          {{ material() ? 'Guardar cambios' : 'Crear material' }}
        </button>
      </div>
    </form>
  `,
})
export class MaterialForm implements OnInit {
  private readonly api = inject(MaterialesApi);
  private readonly escrituras = inject(MaterialesEscrituras);

  readonly tournamentId = input.required<string>();
  readonly material = input<Material | null>(null);
  /** true: llegó al servidor; false: sin conexión, la edición quedó en la cola. */
  readonly saved = output<boolean>();
  readonly cancelled = output();

  protected readonly tipos = TIPOS_MATERIAL;
  protected readonly tipoLabel = TIPO_MATERIAL_LABEL;
  protected readonly imagen = signal<File | null>(null);

  private readonly model = signal<Campos>({
    marca: '',
    modelo: '',
    stock: 0,
    precio: 0,
    tipo: 'Grip',
  });

  protected readonly form = form(
    this.model,
    (path) => {
      // Los mismos límites que MaterialRequestDto
      required(path.marca, { message: 'Indica la marca' });
      maxLength(path.marca, 100, { message: 'No puede superar 100 caracteres' });
      required(path.modelo, { message: 'Indica el modelo' });
      maxLength(path.modelo, 100, { message: 'No puede superar 100 caracteres' });
      min(path.stock, 0, { message: 'No puede ser negativo' });
      min(path.precio, 0.1, { message: 'Al menos 0,10 €' });
    },
    {
      submission: {
        action: async (field) => {
          const value: MaterialFormValue = { ...field().value(), imagen: this.imagen() };
          const actual = this.material();
          try {
            if (actual) {
              this.saved.emit((await this.escrituras.editar(actual, value)) !== null);
            } else {
              // Crear pide conexión (el botón «Nuevo material» se desactiva sin ella)
              await firstValueFrom(this.api.create(this.tournamentId(), value));
              this.saved.emit(true);
            }
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );

  ngOnInit() {
    const actual = this.material();
    if (!actual) return;
    const { marca, modelo, stock, precio, tipo } = toMaterialFormValue(actual);
    this.model.set({ marca, modelo, stock, precio, tipo });
  }
}
