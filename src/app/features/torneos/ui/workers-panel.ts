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
import { FormField, FormRoot, form, maxLength, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { toFormErrors } from '../../../core/http/form-errors';
import { ToastService } from '../../../core/toast/toast.service';
import { FieldError } from '../../../shared/ui/field-error';
import { TorneosApi } from '../data-access/torneos.api';
import { TournamentUser, WorkerAssignment } from '../data-access/torneos.models';

@Component({
  selector: 'app-workers-panel',
  imports: [FormField, FormRoot, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-base-200 rounded-box p-4">
      <h2 class="mb-3 text-lg font-bold">Encordadores</h2>

      @if (rows().length === 0) {
        <p class="opacity-70">Todavía no hay encordadores en este torneo.</p>
      }

      <ul class="divide-base-300 divide-y">
        @for (row of rows(); track row.username) {
          <li class="flex items-center justify-between gap-2 py-2">
            <div class="min-w-0">
              <p class="truncate font-medium">{{ row.name || row.username }}</p>
              <p class="text-sm opacity-70">{{ row.machine ?? 'Sin máquina asignada' }}</p>
            </div>
            @if (canManage()) {
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                [attr.aria-label]="'Quitar a ' + row.username"
                (click)="remove(row.username)"
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
            <label class="fieldset-legend" for="worker-user">Añadir encordador</label>
            <select id="worker-user" class="select w-full" [formField]="form.userId">
              <option value="">Selecciona un encordador</option>
              @for (candidate of candidates(); track candidate.userId) {
                <option [value]="candidate.userId">
                  {{ candidate.name || candidate.username }}
                </option>
              }
            </select>
            <app-field-error [field]="form.userId" />

            <label class="fieldset-legend" for="worker-machine">Máquina</label>
            <input id="worker-machine" class="input w-full" [formField]="form.machineName" />
            <app-field-error [field]="form.machineName" />
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
export class WorkersPanel {
  private readonly api = inject(TorneosApi);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly tournamentId = input.required<string>();
  readonly stringers = input.required<TournamentUser[]>();
  readonly assignments = input<WorkerAssignment[]>([]);
  readonly canManage = input(false);
  readonly changed = output();

  private readonly encorders = rxResource({
    params: () => (this.canManage() ? true : undefined),
    stream: () => this.api.encorders(),
    defaultValue: [],
  });

  // value() lanza si el recurso falló: un error de red no debe romper la pantalla
  private readonly encorderList = computed(() =>
    this.encorders.hasValue() ? this.encorders.value() : [],
  );

  /** Un encordador puede estar en el torneo sin máquina: la lista sale del detalle. */
  protected readonly rows = computed(() =>
    this.stringers().map((user) => ({
      ...user,
      machine:
        this.assignments().find((a) => a.user.username === user.username)?.machineName ?? null,
    })),
  );

  protected readonly candidates = computed(() => {
    const present = new Set(this.stringers().map((user) => user.username));
    return this.encorderList().filter((user) => !present.has(user.username));
  });

  private readonly model = signal({ userId: '', machineName: '' });

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.userId, { message: 'Elige un encordador' });
      required(path.machineName, { message: 'Indica la máquina' });
      maxLength(path.machineName, 50, { message: 'No puede superar 50 caracteres' });
    },
    {
      submission: {
        action: async (field) => {
          const { userId, machineName } = field().value();
          try {
            await firstValueFrom(this.api.addWorker(this.tournamentId(), userId, machineName));
            this.model.set({ userId: '', machineName: '' });
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
    // /workers y el detalle no traen el id: sale del listado de encordadores
    const user = this.encorderList().find((candidate) => candidate.username === username);
    if (!user) {
      this.toast.error('No se ha podido identificar a este encordador');
      return;
    }

    const ok = await this.confirm.ask({
      title: 'Quitar encordador',
      message: `¿Quitar a ${user.name || username} de este torneo?`,
      confirmText: 'Quitar',
      danger: true,
    });
    if (!ok) return;

    try {
      await firstValueFrom(this.api.removeWorker(this.tournamentId(), user.userId));
      this.changed.emit();
    } catch {
      // El interceptor ya ha mostrado el error
    }
  }
}
