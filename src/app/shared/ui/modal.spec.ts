import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Modal } from './modal';

@Component({
  imports: [Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal heading="Nuevo torneo" [open]="open()" (closed)="open.set(false)">
      @if (open()) {
        <p>Contenido</p>
      }
    </app-modal>
  `,
})
class Host {
  readonly open = signal(false);
}

describe('Modal', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, dialog: element.querySelector('dialog')! };
  };

  const openModal = async (fixture: Awaited<ReturnType<typeof setup>>['fixture']) => {
    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
  };

  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  it('cerrado no pinta el contenido', async () => {
    const { dialog } = await setup();
    expect(dialog.open).toBe(false);
    expect(dialog.textContent).not.toContain('Contenido');
  });

  it('se abre con el título y el contenido', async () => {
    const { fixture, dialog } = await setup();
    await openModal(fixture);
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Nuevo torneo');
    expect(dialog.textContent).toContain('Contenido');
  });

  it('el botón de cerrar lo cierra', async () => {
    const { fixture, element, dialog } = await setup();
    await openModal(fixture);

    element.querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]')!.click();
    await fixture.whenStable();

    expect(dialog.open).toBe(false);
  });

  it('Esc pasa por `closed` en lugar de cerrarse por su cuenta', async () => {
    const { fixture, dialog } = await setup();
    await openModal(fixture);
    const event = new Event('cancel', { cancelable: true });

    dialog.dispatchEvent(event);
    await fixture.whenStable();

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.open()).toBe(false);
  });
});
