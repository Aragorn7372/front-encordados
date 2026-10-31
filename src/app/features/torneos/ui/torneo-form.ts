import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, FormRoot, form, maxLength, required, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { toFormErrors } from '../../../core/http/form-errors';
import { TournamentSummary } from '../../../shared/models/tournament';
import { FieldError } from '../../../shared/ui/field-error';
import { FilePicker } from '../../../shared/ui/file-picker';
import { TorneosApi } from '../data-access/torneos.api';
import { toDateInput } from '../data-access/torneos.mapper';

@Component({
  selector: 'app-torneo-form',
  imports: [FormField, FormRoot, FieldError, FilePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formRoot]="form">
      <fieldset class="fieldset">
        <label class="fieldset-legend" for="torneo-name">Nombre</label>
        <input id="torneo-name" class="input w-full" [formField]="form.name" />
        <app-field-error [field]="form.name" />

        @if (needsOwner()) {
          <label class="fieldset-legend" for="torneo-owner">Propietario</label>
          <select id="torneo-owner" class="select w-full" [formField]="form.ownerId">
            <option value="">Selecciona un propietario</option>
            @for (owner of ownerList(); track owner.userId) {
              <option [value]="owner.userId">{{ owner.name || owner.username }}</option>
            }
          </select>
          <app-field-error [field]="form.ownerId" />
        }

        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="fieldset-legend" for="torneo-start">Inicio</label>
            <input
              id="torneo-start"
              class="input w-full"
              type="date"
              [formField]="form.startDate"
            />
            <app-field-error [field]="form.startDate" />
          </div>
          <div>
            <label class="fieldset-legend" for="torneo-end">Fin</label>
            <input id="torneo-end" class="input w-full" type="date" [formField]="form.endDate" />
            <app-field-error [field]="form.endDate" />
          </div>
        </div>

        <span class="fieldset-legend">Logotipo</span>
        <app-file-picker
          label="Logotipo"
          accept="image/*"
          [currentImage]="tournament()?.logotype ?? null"
          (fileSelected)="logo.set($event)"
        />
      </fieldset>

      @for (error of form().errors(); track error.kind) {
        <div role="alert" class="alert alert-error alert-soft mt-2">{{ error.message }}</div>
      }

      <div class="modal-action">
        <button type="button" class="btn" (click)="cancelled.emit()">Cancelar</button>
        <button class="btn btn-primary" [disabled]="form().submitting()">Guardar</button>
      </div>
    </form>
  `,
})
export class TorneoForm implements OnInit {
  private readonly api = inject(TorneosApi);
  private readonly auth = inject(AuthStore);

  /** Sin torneo, el formulario crea uno nuevo. */
  readonly tournament = input<TournamentSummary | null>(null);
  readonly saved = output();
  readonly cancelled = output();

  protected readonly logo = signal<File | null>(null);
  private readonly model = signal({ name: '', ownerId: '', startDate: '', endDate: '' });

  protected readonly needsOwner = computed(
    () => this.tournament() === null && this.auth.hasRole('ADMIN'),
  );

  protected readonly owners = rxResource({
    params: () => (this.needsOwner() ? true : undefined),
    stream: () => this.api.owners(),
    defaultValue: [],
  });

  // value() lanza si el recurso falló: un error de red no debe romper la pantalla
  protected readonly ownerList = computed(() =>
    this.owners.hasValue() ? this.owners.value() : [],
  );

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.name, { message: 'Escribe el nombre' });
      maxLength(path.name, 200, { message: 'No puede superar 200 caracteres' });
      required(path.ownerId, { when: () => this.needsOwner(), message: 'Elige un propietario' });
      required(path.startDate, { message: 'Indica la fecha de inicio' });
      required(path.endDate, { message: 'Indica la fecha de fin' });
      validate(path.endDate, ({ value, valueOf }) =>
        value() && value() < valueOf(path.startDate)
          ? { kind: 'dateOrder', message: 'El fin no puede ser anterior al inicio' }
          : undefined,
      );
    },
    {
      submission: {
        action: async (field) => {
          const value = { ...field().value(), logo: this.logo() };
          const current = this.tournament();
          try {
            await firstValueFrom(
              current
                ? this.api.update(current.id, value)
                : this.api.create(value, this.needsOwner()),
            );
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
    const current = this.tournament();
    if (!current) return;
    this.model.set({
      name: current.name,
      ownerId: '',
      startDate: toDateInput(current.startTournament),
      endDate: toDateInput(current.endTournament),
    });
  }
}
