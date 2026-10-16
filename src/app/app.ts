import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme/theme.service';
import { ToastService } from './core/toast/toast.service';
import { Toaster } from './core/toast/toaster';
import { ConfirmDialog } from './core/confirm/confirm-dialog';
import { ConfirmService } from './core/confirm/confirm.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DatePipe, CurrencyPipe, Toaster, ConfirmDialog],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected readonly toastService = inject(ToastService);
  protected readonly hoy = new Date();
  protected readonly confirm = inject(ConfirmService);

  async probarConfirm() {
    const ok = await this.confirm.ask({
      title: 'Borrar pedido',
      message: '¿Seguro?',
      danger: true,
    });
    this.toastService.show(ok ? 'Confirmado' : 'Cancelado', ok ? 'success' : 'info');
  }
}
