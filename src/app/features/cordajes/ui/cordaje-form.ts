import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormField, FormRoot, form, max, maxLength, min, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toFormErrors } from '../../../core/http/form-errors';
import { FieldError } from '../../../shared/ui/field-error';
import { FilePicker } from '../../../shared/ui/file-picker';
import { CordajesApi } from '../data-access/api/cordajes.api';
import { FORMATOS_CUERDA, TIPOS_CUERDA } from '../data-access/dto/cordaje.dto';
import { toCordajeFormValue } from '../data-access/mapper/cordaje.mapper';
import {
  Cordaje,
  CordajeFormValue,
  FORMATO_LABEL,
  TIPO_LABEL,
} from '../data-access/model/cordaje.model';

/** La imagen va aparte: un File no es un campo que validar. */
type Campos = Omit<CordajeFormValue, 'imagen'>;

/** Crear (sin `cordaje`) o editar un cordaje. */
@Component({
  selector: 'app-cordaje-form',
  imports: [FormField, FormRoot, FieldError, FilePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formRoot]="form">
      <div class="grid gap-x-4 sm:grid-cols-2">
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="cordaje-marca">Marca</label>
          <input id="cordaje-marca" class="input w-full" [formField]="form.marca" />
          <app-field-error [field]="form.marca" />
        </fieldset>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="cordaje-modelo">Modelo</label>
          <input id="cordaje-modelo" class="input w-full" [formField]="form.modelo" />
          <app-field-error [field]="form.modelo" />
        </fieldset>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="cordaje-tipo">Tipo</label>
          <select id="cordaje-tipo" class="select w-full" [formField]="form.tipo">
            @for (tipo of tipos; track tipo) {
              <option [value]="tipo">{{ tipoLabel[tipo] }}</option>
            }
          </select>
        </fieldset>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="cordaje-formato">Formato</label>
          <select id="cordaje-formato" class="select w-full" [formField]="form.formato">
            @for (formato of formatos; track formato) {
              <option [value]="formato">{{ formatoLabel[formato] }}</option>
            }
          </select>
        </fieldset>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="cordaje-calibre">Calibre (mm)</label>
          <input
            id="cordaje-calibre"
            class="input w-full"
            type="number"
            step="0.01"
            [formField]="form.calibre"
          />
          <app-field-error [field]="form.calibre" />
        </fieldset>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="cordaje-precio">Precio (€)</label>
          <input
            id="cordaje-precio"
            class="input w-full"
            type="number"
            step="0.01"
            [formField]="form.precio"
          />
          <app-field-error [field]="form.precio" />
        </fieldset>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="cordaje-stock">Stock</label>
          <input id="cordaje-stock" class="input w-full" type="number" [formField]="form.stock" />
          <app-field-error [field]="form.stock" />
        </fieldset>
        <fieldset class="fieldset">
          <span class="fieldset-legend">Imagen</span>
          <app-file-picker
            label="Imagen del cordaje"
            accept="image/*"
            [currentImage]="cordaje()?.imagen ?? null"
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
          {{ cordaje() ? 'Guardar cambios' : 'Crear cordaje' }}
        </button>
      </div>
    </form>
  `,
})
export class CordajeForm implements OnInit {
  private readonly api = inject(CordajesApi);

  readonly tournamentId = input.required<string>();
  readonly cordaje = input<Cordaje | null>(null);
  readonly saved = output<Cordaje>();
  readonly cancelled = output();

  protected readonly tipos = TIPOS_CUERDA;
  protected readonly formatos = FORMATOS_CUERDA;
  protected readonly tipoLabel = TIPO_LABEL;
  protected readonly formatoLabel = FORMATO_LABEL;
  protected readonly imagen = signal<File | null>(null);

  private readonly model = signal<Campos>({
    marca: '',
    modelo: '',
    stock: 0,
    precio: 0,
    formato: 'Reel',
    tipo: 'Polyester',
    calibre: 1.25,
  });

  protected readonly form = form(
    this.model,
    (path) => {
      // Los mismos límites que CuerdaRequestDto
      required(path.marca, { message: 'Indica la marca' });
      maxLength(path.marca, 100, { message: 'No puede superar 100 caracteres' });
      required(path.modelo, { message: 'Indica el modelo' });
      maxLength(path.modelo, 100, { message: 'No puede superar 100 caracteres' });
      min(path.stock, 0, { message: 'No puede ser negativo' });
      min(path.precio, 0.1, { message: 'Al menos 0,10 €' });
      min(path.calibre, 0, { message: 'No puede ser negativo' });
      max(path.calibre, 3, { message: '¿Seguro? Más de 3 mm' });
    },
    {
      submission: {
        action: async (field) => {
          const value: CordajeFormValue = { ...field().value(), imagen: this.imagen() };
          const actual = this.cordaje();
          try {
            const guardado = await firstValueFrom(
              actual
                ? this.api.update(actual.id, value, true)
                : this.api.create(this.tournamentId(), value),
            );
            this.saved.emit(guardado);
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );

  ngOnInit() {
    const actual = this.cordaje();
    if (!actual) return;
    const { marca, modelo, stock, precio, formato, tipo, calibre } = toCordajeFormValue(actual);
    this.model.set({ marca, modelo, stock, precio, formato, tipo, calibre });
  }
}
