import { RequiereConexion } from '../../../shared/ui/requiere-conexion';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { ToastService } from '../../../core/toast/toast.service';
import { TournamentSummary } from '../../../shared/models/tournament';
import { SinDatos } from '../../../core/offline/sin-datos';
import { EmptyState } from '../../../shared/ui/empty-state';
import { Modal } from '../../../shared/ui/modal';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { SearchInput } from '../../../shared/ui/search-input';
import { TorneosStore } from '../data-access/store/torneos.store';
import { TorneoCard } from '../ui/torneo-card';
import { TorneoForm } from '../ui/torneo-form';

/** `undefined`: formulario cerrado. `null`: creando. Con valor: editando ese torneo. */
type Editing = TournamentSummary | null | undefined;

@Component({
  selector: 'app-torneos-list',
  imports: [
    RequiereConexion,
    SinDatos,
    EmptyState,
    Modal,
    PageHeader,
    Paginator,
    SearchInput,
    TorneoCard,
    TorneoForm,
  ],
  providers: [TorneosStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header heading="Torneos">
      @if (canManage()) {
        <button
          type="button"
          class="btn btn-primary"
          appRequiereConexion
          (click)="editing.set(null)"
        >
          Nuevo torneo
        </button>
      }
    </app-page-header>

    <div class="mb-4 max-w-md">
      <app-search-input placeholder="Buscar torneo…" (searched)="store.setSearch($event)" />
    </div>

    @if (store.failed()) {
      <app-sin-datos que="torneos" />
    } @else if (store.tournaments().length === 0 && !store.loading()) {
      <app-empty-state heading="No hay torneos" message="Cuando haya alguno, aparecerá aquí." />
    } @else {
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3" [attr.aria-busy]="store.loading()">
        @for (tournament of store.tournaments(); track tournament.id) {
          <app-torneo-card
            [tournament]="tournament"
            [canEdit]="canManage()"
            [canDelete]="canDelete()"
            (edited)="editing.set(tournament)"
            (deleted)="remove(tournament)"
          />
        }
      </div>
    }

    <app-paginator
      [page]="store.query().page"
      [totalPages]="store.totalPages()"
      (pageChange)="store.setPage($event)"
    />

    <app-modal
      [heading]="editing() ? 'Editar torneo' : 'Nuevo torneo'"
      [open]="editing() !== undefined"
      (closed)="editing.set(undefined)"
    >
      <!-- ng-content no es perezoso: sin este @if el formulario se crearía con la página -->
      @if (editing() !== undefined) {
        <app-torneo-form
          [tournament]="editing() ?? null"
          (saved)="onSaved()"
          (cancelled)="editing.set(undefined)"
        />
      }
    </app-modal>
  `,
})
export default class TorneosList {
  protected readonly store = inject(TorneosStore);
  private readonly auth = inject(AuthStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly editing = signal<Editing>(undefined);
  protected readonly canManage = computed(() => this.auth.hasRole('ADMIN', 'OWNER'));
  protected readonly canDelete = computed(() => this.auth.hasRole('ADMIN'));

  protected onSaved(): void {
    this.toast.success(this.editing() ? 'Torneo actualizado' : 'Torneo creado');
    this.editing.set(undefined);
    this.store.refresh();
  }

  protected async remove(tournament: TournamentSummary): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Borrar torneo',
      message: `¿Borrar "${tournament.name}"?`,
      confirmText: 'Borrar',
      danger: true,
    });
    if (!ok) return;

    try {
      await this.store.remove(tournament.id);
      this.toast.success('Torneo borrado');
    } catch {
      // El interceptor ya ha mostrado el error
    }
  }
}
