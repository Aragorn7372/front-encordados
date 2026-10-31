import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-status-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center">
      <p class="text-6xl font-bold opacity-30">{{ code() }}</p>
      <h1 class="text-2xl font-bold">{{ heading() }}</h1>
      <p class="opacity-70">{{ message() }}</p>
      <a class="btn btn-primary mt-2" routerLink="/">Volver al inicio</a>
    </section>
  `,
})
export class StatusPage {
  readonly code = input.required<string>();
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
}
