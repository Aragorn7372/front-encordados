import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ThemeToggle } from '../../../shared/ui/theme-toggle';

@Component({
  selector: 'app-auth-card',
  imports: [ThemeToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="bg-base-200 flex min-h-dvh items-center justify-center p-4">
      <div class="fixed top-3 right-3"><app-theme-toggle /></div>
      <section class="card bg-base-100 w-full max-w-sm shadow">
        <div class="card-body">
          <p class="text-sm opacity-70">Encuerda tu raqueta</p>
          <h1 class="card-title text-2xl">{{ heading() }}</h1>
          <ng-content />
        </div>
      </section>
    </main>
  `,
})
export class AuthCard {
  readonly heading = input.required<string>();
}
