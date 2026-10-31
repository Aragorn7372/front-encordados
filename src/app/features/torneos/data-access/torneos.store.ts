import { Injectable, computed, inject, resource, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TournamentContext } from '../../../core/tournament-context/tournament-context';
import { PageQuery } from '../../../shared/models/page';
import { TorneosApi } from './torneos.api';

/** Estado de la pantalla de listado: la query manda y el recurso se recarga solo. */
@Injectable()
export class TorneosStore {
  private readonly api = inject(TorneosApi);
  private readonly context = inject(TournamentContext);

  readonly query = signal<PageQuery>({
    page: 0,
    size: 12,
    sortBy: 'name',
    direction: 'asc',
    search: '',
  });

  private readonly result = resource({
    params: () => this.query(),
    loader: ({ params }) => firstValueFrom(this.api.list(params)),
  });

  private readonly page = computed(() => (this.result.hasValue() ? this.result.value() : null));

  readonly tournaments = computed(() => this.page()?.content ?? []);
  readonly totalPages = computed(() => this.page()?.totalPages ?? 0);
  readonly loading = this.result.isLoading;
  readonly failed = computed(() => this.result.error() !== undefined);

  setSearch(search: string): void {
    this.query.update((query) => ({ ...query, search, page: 0 }));
  }

  setPage(page: number): void {
    this.query.update((query) => ({ ...query, page }));
  }

  /** El selector de torneo global también debe enterarse. */
  refresh(): void {
    this.result.reload();
    this.context.reload();
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.api.remove(id));
    this.refresh();
  }
}
