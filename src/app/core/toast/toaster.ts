import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { ToastType } from './toast.model';

@Component({
  selector: 'app-toaster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast toast-end z-50">
      @for (t of toast.toasts(); track t.id) {
        <div role="alert" class="alert" [class]="alertClass[t.type]">
          <span>{{ t.message }}</span>
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            aria-label="Cerrar"
            (click)="toast.dismiss(t.id)"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
})
export class Toaster {
  protected readonly toast = inject(ToastService);
  protected readonly alertClass: Record<ToastType, string> = {
    info: 'alert-info',
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'alert-error',
  };
}
