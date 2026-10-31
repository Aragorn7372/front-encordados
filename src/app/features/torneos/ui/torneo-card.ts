import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TOURNAMENT_STATUS } from '../../../shared/models/status';
import { TournamentSummary, tournamentStatus } from '../../../shared/models/tournament';
import { StatusBadge } from '../../../shared/ui/status-badge';

@Component({
  selector: 'app-torneo-card',
  imports: [DatePipe, RouterLink, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card bg-base-200 h-full">
      <div class="card-body">
        <div class="flex items-start gap-3">
          @if (tournament().logotype; as logo) {
            <img class="rounded-box size-12 object-cover" alt="" loading="lazy" [src]="logo" />
          }
          <div class="min-w-0 flex-1">
            <h2 class="card-title text-base">
              <a class="link-hover" [routerLink]="['/torneos', tournament().id]">
                {{ tournament().name }}
              </a>
            </h2>
            <p class="text-sm opacity-70">
              {{ tournament().startTournament | date: 'mediumDate' }} –
              {{ tournament().endTournament | date: 'mediumDate' }}
            </p>
          </div>
          <app-status-badge [status]="status()" />
        </div>

        @if (canEdit() || canDelete()) {
          <div class="card-actions mt-2 justify-end">
            @if (canEdit()) {
              <button type="button" class="btn btn-sm" (click)="edited.emit()">Editar</button>
            }
            @if (canDelete()) {
              <button type="button" class="btn btn-sm btn-error" (click)="deleted.emit()">
                Borrar
              </button>
            }
          </div>
        }
      </div>
    </article>
  `,
})
export class TorneoCard {
  readonly tournament = input.required<TournamentSummary>();
  readonly canEdit = input(false);
  readonly canDelete = input(false);
  readonly edited = output();
  readonly deleted = output();

  protected readonly status = computed(
    () => TOURNAMENT_STATUS[tournamentStatus(this.tournament())],
  );
}
