import { Injectable, signal } from '@angular/core';
import { Toast } from './toast.model';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 0;

  show(message: string, type: Toast['type'] = 'info', ms = 4000) {
    const id = ++this.nextId;
    this.toasts.update((list) => [...list, { id, message, type }]);
    setTimeout(() => this.dismiss(id), ms);
  }

  success = (m: string) => this.show(m, 'success');
  error = (m: string) => this.show(m, 'error', 6000);
  warning = (m: string) => this.show(m, 'warning', 5000);
  info = (m: string) => this.show(m, 'info', 4000);
  dismiss = (id: number) => this.toasts.update((l) => l.filter((t) => t.id !== id));
}
