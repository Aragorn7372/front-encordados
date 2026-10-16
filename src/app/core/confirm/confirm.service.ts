import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<PendingConfirm | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    this.close(false); // cierra cualquier diálogo abierto antes de abrir uno nuevo
    return new Promise<boolean>((resolve) => this.current.set({ ...options, resolve }));
  }

  close(ok: boolean) {
    const pending = this.current();
    if (pending) {
      pending.resolve(ok);
      this.current.set(null);
    }
  }
}
