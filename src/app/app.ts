import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme/theme.service';
import { ToastService } from './core/toast/toast.service';
import { Toaster } from './core/toast/toaster';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DatePipe, CurrencyPipe, Toaster], // ← Toaster
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected readonly toastService = inject(ToastService); // ← nueva
  protected readonly hoy = new Date();
}
