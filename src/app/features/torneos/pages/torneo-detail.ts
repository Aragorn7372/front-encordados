import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { TOURNAMENT_STATUS } from '../../../shared/models/status';
import { tournamentStatus } from '../../../shared/models/tournament';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { TorneosApi } from '../data-access/api/torneos.api';
import { SupervisorsPanel } from '../ui/supervisors-panel';
import { WorkersPanel } from '../ui/workers-panel';
import { Avatar } from '../../../shared/ui/avatar';

@Component({
  selector: 'app-torneo-detail',
  imports: [
    Avatar,
    DatePipe,
    RouterLink,
    EmptyState,
    PageHeader,
    StatusBadge,
    SupervisorsPanel,
    WorkersPanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="link mb-3 inline-block text-sm" routerLink="/torneos">← Volver a torneos</a>

    @if (tournament(); as data) {
      <app-page-header
        [heading]="data.name"
        [subtitle]="
          (data.startTournament | date: 'longDate') +
          ' – ' +
          (data.endTournament | date: 'longDate')
        "
      >
        <app-status-badge [status]="status()!" />
      </app-page-header>

      <p class="mb-4 flex items-center gap-2">
        <span class="opacity-70">Propietario:</span>
        <app-avatar [url]="data.owner.imageUrl" [nombre]="data.owner.name || data.owner.username" />
        {{ data.owner.name || data.owner.username }}
      </p>

      <div class="grid gap-4 lg:grid-cols-2">
        <app-workers-panel
          [tournamentId]="data.id"
          [stringers]="data.stringers"
          [assignments]="assignmentList()"
          [canManage]="canManage()"
          (changed)="reload()"
        />
        <app-supervisors-panel
          [tournamentId]="data.id"
          [supervisors]="data.supervisors"
          [canManage]="canManage()"
          (changed)="reload()"
        />
      </div>
    } @else if (detail.error()) {
      <app-empty-state
        heading="No se ha podido cargar el torneo"
        message="Puede que ya no exista o que no tengas acceso."
      />
    } @else {
      <span class="loading loading-spinner" aria-label="Cargando"></span>
    }
  `,
})
export default class TorneoDetail {
  private readonly api = inject(TorneosApi);
  private readonly auth = inject(AuthStore);

  /** Parámetro :id de la ruta. */
  readonly id = input.required<string>();

  protected readonly canManage = computed(() => this.auth.hasRole('ADMIN', 'OWNER'));

  protected readonly detail = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.api.get(params),
  });

  // Solo gestión: ENCORDER trabaja con los encordadores que ya trae el detalle
  protected readonly assignments = rxResource({
    params: () => (this.canManage() ? this.id() : undefined),
    stream: ({ params }) => this.api.workers(params),
    defaultValue: [],
  });

  protected readonly assignmentList = computed(() =>
    this.assignments.hasValue() ? this.assignments.value() : [],
  );

  protected readonly tournament = computed(() =>
    this.detail.hasValue() ? this.detail.value() : null,
  );

  protected readonly status = computed(() => {
    const tournament = this.tournament();
    return tournament ? TOURNAMENT_STATUS[tournamentStatus(tournament)] : null;
  });

  protected reload(): void {
    this.detail.reload();
    this.assignments.reload();
  }
}
