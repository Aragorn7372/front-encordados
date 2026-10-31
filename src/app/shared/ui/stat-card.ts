import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tone } from '../models/status';

@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-base-200 rounded-box p-4">
      <p class="text-sm opacity-70">{{ label() }}</p>
      <p class="text-3xl font-bold" [class]="toneClass[tone()]">{{ value() }}</p>
      @if (hint(); as text) {
        <p class="text-xs opacity-70">{{ text }}</p>
      }
    </div>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>();
  readonly tone = input<Tone>('neutral');

  protected readonly toneClass: Record<Tone, string> = {
    neutral: 'text-base-content',
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  };
}
