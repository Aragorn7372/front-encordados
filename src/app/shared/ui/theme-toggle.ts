import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../../core/theme/theme.service';
import { Icon } from './icon';

@Component({
  selector: 'app-theme-toggle',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="btn btn-ghost btn-square"
      [attr.aria-label]="theme.theme() === 'black' ? 'Usar tema claro' : 'Usar tema oscuro'"
      (click)="theme.toggle()"
    >
      <app-icon [name]="theme.theme() === 'black' ? 'sol' : 'luna'" />
    </button>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
}
