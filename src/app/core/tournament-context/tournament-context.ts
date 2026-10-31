import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { PageResponse, toPageParams } from '../../shared/models/page';
import { Role } from '../../shared/models/roles';
import { TournamentSummary } from '../../shared/models/tournament';
import { AuthStore } from '../auth/store/auth.store';

const STORAGE_KEY = 'etr_torneo';
const QUERY_PARAM = 'torneo';
const MAX_TOURNAMENTS = 200;

/** USER no tiene torneos: ve sus pedidos, sean del torneo que sean. */
const ROLES_WITH_TOURNAMENTS: Role[] = ['ADMIN', 'OWNER', 'ENCORDER', 'SUPERVISOR'];

/**
 * Torneo activo de toda la app. El listado ya viene filtrado por el backend según el usuario,
 * y es el único endpoint de torneos que admite a todos estos roles.
 */
@Injectable({ providedIn: 'root' })
export class TournamentContext {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  private readonly _selectedId = signal(localStorage.getItem(STORAGE_KEY));
  readonly selectedId = this._selectedId.asReadonly();

  private readonly list = httpResource<PageResponse<TournamentSummary>>(() =>
    this.auth.hasRole(...ROLES_WITH_TOURNAMENTS)
      ? {
          url: '/api/tournaments',
          params: toPageParams(
            { page: 0, size: MAX_TOURNAMENTS, sortBy: 'name', direction: 'asc' },
            'pageSize',
          ),
        }
      : undefined,
  );

  readonly tournaments = computed(() => (this.list.hasValue() ? this.list.value().content : []));
  readonly loading = this.list.isLoading;
  readonly selected = computed(
    () => this.tournaments().find((t) => t.id === this._selectedId()) ?? null,
  );

  constructor() {
    effect(() => {
      const id = this._selectedId();
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    });

    // Otro usuario en el mismo navegador no debe heredar el torneo del anterior
    effect(() => {
      if (!this.auth.isLoggedIn()) this._selectedId.set(null);
    });

    effect(() => {
      if (!this.list.hasValue()) return;
      const tournaments = this.list.value().content;
      if (tournaments.length === 1) this._selectedId.set(tournaments[0].id);
      else if (!tournaments.some((t) => t.id === this._selectedId())) this._selectedId.set(null);
    });

    // Enlaces directos, como los del escáner: ?torneo=<id>
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const id = this.router.parseUrl(this.router.url).queryParams[QUERY_PARAM] as
          string | undefined;
        if (id) this._selectedId.set(id);
      });
  }

  select(id: string | null): void {
    this._selectedId.set(id);
  }

  /** Tras crear, editar o borrar un torneo. */
  reload(): void {
    this.list.reload();
  }
}
