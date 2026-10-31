import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav class="join mt-4" aria-label="Paginación">
        <button
          type="button"
          class="join-item btn"
          [disabled]="page() === 0"
          (click)="pageChange.emit(page() - 1)"
        >
          Anterior
        </button>
        <span class="join-item btn btn-disabled"
          >Página {{ page() + 1 }} de {{ totalPages() }}</span
        >
        <button
          type="button"
          class="join-item btn"
          [disabled]="page() >= totalPages() - 1"
          (click)="pageChange.emit(page() + 1)"
        >
          Siguiente
        </button>
      </nav>
    }
  `,
})
export class Paginator {
  /** Empieza en 0, como en el backend. */
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();
}
