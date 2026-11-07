import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PrecargaService } from '../core/offline/precarga.service';
import { TournamentContext } from '../core/tournament-context/tournament-context';

@Component({
  selector: 'app-tournament-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (context.tournaments().length > 1) {
      <select
        class="select select-sm max-w-56"
        aria-label="Torneo activo"
        (change)="onChange($event)"
      >
        <option value="" [selected]="!context.selectedId()">Selecciona un torneo</option>
        @for (tournament of context.tournaments(); track tournament.id) {
          <option [value]="tournament.id" [selected]="tournament.id === context.selectedId()">
            {{ precarga.guardados()[tournament.id] ? '✓ ' : '' }}{{ tournament.name }}
          </option>
        }
      </select>
    } @else if (context.selected(); as tournament) {
      <span class="max-w-56 truncate text-sm font-medium">{{ tournament.name }}</span>
    }
  `,
})
export class TournamentSwitcher {
  protected readonly context = inject(TournamentContext);
  /** Los torneos guardados llevan ✓: se pueden abrir sin conexión. */
  protected readonly precarga = inject(PrecargaService);

  protected onChange(event: Event) {
    this.context.select((event.target as HTMLSelectElement).value || null);
  }
}
