import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StatusInfo, Tone } from '../models/status';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="toneClass[status().tone]">{{ status().label }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<StatusInfo>();

  // Clases completas: Tailwind no detecta las construidas concatenando
  protected readonly toneClass: Record<Tone, string> = {
    neutral: 'badge-neutral',
    info: 'badge-info',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
  };
}
