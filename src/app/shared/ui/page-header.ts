import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">{{ heading() }}</h1>
        @if (subtitle(); as text) {
          <p class="opacity-70">{{ text }}</p>
        }
      </div>
      <div class="flex flex-wrap gap-2"><ng-content /></div>
    </header>
  `,
})
export class PageHeader {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>();
}
