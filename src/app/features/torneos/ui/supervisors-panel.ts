import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { toFormErrors } from '../../../core/http/form-errors';
import { ToastService } from '../../../core/toast/toast.service';
import { FieldError } from '../../../shared/ui/field-error';
import { TorneosApi } from '../data-access/torneos.api';
import { TournamentUser } from '../data-access/torneos.models';

@Component({
  selector: 'app-supervisors-panel',
  imports: [FormField, FormRoot, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-base-200 rounded-box p-4">
      <h2 class="mb-3 text-lg font-bold">Supervisores</h2>

      @if (supervisors().length === 0) {
        <p class="opacity-70">Este torneo no tiene supervisores.</p>
      }

      <ul class="divide-base-300 divide-y">
        @for (user of supervisors(); track user.username) {
          <li class="flex items-center justify-between gap-2 py-2">
            <span class="truncate font-medium">{{ user.name || user.username }}</span>
            @if (canManage()) {
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                [attr.aria-label]="'Quitar a ' + user.username"
                (click)="remove(user.username)"
              >
                Quitar
              </button>
            }
          </li>
        }
      </ul>

      @if (canManage()) {
        <form class="mt-4" [formRoot]="form">
          <fieldset class="fieldset">
            <label class="fieldset-legend" for="supervisor-user">Añadir supervisor</label>
            <select id="supervisor-user" class="select w-full" [formField]="form.supervisorId">
              <option value="">Selecciona un supervisor</option>
              @for (candidate of candidates(); track candidate.userId) {
                <option [value]="candidate.userId">
                  {{ candidate.name || candidate.username }}
                </option>
              }
            </select>
            <app-field-error [field]="form.supervisorId" />
          </fieldset>

          @for (error of form().errors(); track error.kind) {
            <div role="alert" class="alert alert-error alert-soft mt-2">{{ error.message }}</div>
          }

          <button class="btn btn-primary btn-sm mt-3" [disabled]="form().submitting()">
            Añadir
          </button>
        </form>
      }
    </section>
  `,
})
export class SupervisorsPanel {
  private readonly api = inject(TorneosApi);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly tournamentId = input.required<string>();
  readonly supervisors = input.required<TournamentUser[]>();
  readonly canManage = input(false);
  readonly changed = output();

  private readonly staff = rxResource({
    params: () => (this.canManage() ? true : undefined),
    stream: () => this.api.supervisors(),
    defaultValue: [],
  });

  // value() lanza si el recurso falló: un error de red no debe romper la pantalla
  private readonly staffList = computed(() => (this.staff.hasValue() ? this.staff.value() : []));

  protected readonly candidates = computed(() => {
    const present = new Set(this.supervisors().map((user) => user.username));
    return this.staffList().filter((user) => !present.has(user.username));
  });

  private readonly model = signal({ supervisorId: '' });

  protected readonly form = form(
    this.model,
    (path) => required(path.supervisorId, { message: 'Elige un supervisor' }),
    {
      submission: {
        action: async (field) => {
          try {
            await firstValueFrom(
              this.api.assignSupervisor(this.tournamentId(), field().value().supervisorId),
            );
            this.model.set({ supervisorId: '' });
            field().reset();
            this.changed.emit();
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );

  protected async remove(username: string): Promise<void> {
    const user = this.staffList().find((candidate) => candidate.username === username);
    if (!user) {
      this.toast.error('No se ha podido identificar a este supervisor');
      return;
    }

    const ok = await this.confirm.ask({
      title: 'Quitar supervisor',
      message: `¿Quitar a ${user.name || username} de este torneo?`,
      confirmText: 'Quitar',
      danger: true,
    });
    if (!ok) return;

    try {
      await firstValueFrom(this.api.removeSupervisor(this.tournamentId(), user.userId));
      this.changed.emit();
    } catch {
      // El interceptor ya ha mostrado el error
    }
  }
}
