import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Icon } from './icon';

/**
 * Modal genérico: `open` manda y el <dialog> obedece, como en ConfirmDialog.
 * Angular crea el contenido proyectado aunque esté cerrado: si debe nacer al abrir,
 * envuélvelo en un @if donde se usa.
 */
@Component({
  selector: 'app-modal',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="modal" (cancel)="onEsc($event)">
      <div class="modal-box" [class]="wide() ? 'max-w-3xl' : ''">
        <header class="mb-4 flex items-start justify-between gap-2">
          <h2 class="text-lg font-bold">{{ heading() }}</h2>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square"
            aria-label="Cerrar"
            (click)="closed.emit()"
          >
            <app-icon name="cerrar" />
          </button>
        </header>
        <ng-content />
      </div>
    </dialog>
  `,
})
export class Modal {
  readonly heading = input.required<string>();
  readonly open = input.required<boolean>();
  readonly wide = input(false);
  readonly closed = output();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const element = this.dialog().nativeElement;
      if (this.open() && !element.open) element.showModal();
      if (!this.open() && element.open) element.close();
    });
  }

  protected onEsc(event: Event) {
    event.preventDefault(); // quien abre el modal decide si se cierra
    this.closed.emit();
  }
}
