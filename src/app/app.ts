import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialog } from './core/confirm/confirm-dialog';
import { Toaster } from './core/toast/toaster';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toaster, ConfirmDialog],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
