import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dlg class="modal" (cancel)="onEsc($event)">
      @if (confirm.current(); as c) {
        <div class="modal-box">
          <h3 class="text-lg font-bold">{{ c.title }}</h3>
          <p class="py-4">{{ c.message }}</p>

          <div class="modal-action">
            <button type="button" class="btn" (click)="confirm.close(false)">
              {{ c.cancelText ?? 'Cancelar' }}
            </button>
            <button
              type="button"
              class="btn"
              [class]="c.danger ? 'btn-error' : 'btn-primary'"
              (click)="confirm.close(true)"
            >
              {{ c.confirmText ?? 'Aceptar' }}
            </button>
          </div>
        </div>
      }
    </dialog>
  `,
})
export class ConfirmDialog {
  protected readonly confirm = inject(ConfirmService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    // El signal manda: abre o cierra el <dialog> según haya petición pendiente
    effect(() => {
      const el = this.dialog().nativeElement;
      const abierto = this.confirm.current() !== null;

      if (abierto && !el.open) el.showModal();
      if (!abierto && el.open) el.close();
    });
  }

  protected onEsc(event: Event) {
    event.preventDefault(); // que no se cierre "por su cuenta"...
    this.confirm.close(false); // ...lo cerramos a través del servicio, como todo lo demás
  }
}
