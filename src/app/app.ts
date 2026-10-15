import { inject, ChangeDetectionStrategy, Component } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DatePipe, CurrencyPipe],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected readonly hoy = new Date();
}
