import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-base-200 rounded-box flex flex-col items-center gap-2 p-10 text-center">
      <h2 class="text-lg font-bold">{{ heading() }}</h2>
      @if (message(); as text) {
        <p class="opacity-70">{{ text }}</p>
      }
      <ng-content />
    </section>
  `,
})
export class EmptyState {
  readonly heading = input.required<string>();
  readonly message = input<string>();
}
