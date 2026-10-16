import { TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';
import { ConfirmService } from './confirm.service';

describe('ConfirmDialog', () => {
  beforeEach(() => {
    // jsdom no implementa <dialog>: imitamos lo mínimo (el atributo "open")
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });
  it('al pedir confirmación abre el diálogo con el título y el mensaje', async () => {
    const fixture = TestBed.createComponent(ConfirmDialog);
    const confirm = TestBed.inject(ConfirmService);

    void confirm.ask({ title: 'Borrar pedido', message: '¿Seguro?' });
    await fixture.whenStable();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Borrar pedido');
    expect(dialog.textContent).toContain('¿Seguro?');
  });

  it('al cerrar el diálogo con close(true) se resuelve la promesa con true', async () => {
    const fixture = TestBed.createComponent(ConfirmDialog);
    const confirm = TestBed.inject(ConfirmService);

    const promise = confirm.ask({ title: 'Borrar pedido', message: '¿Seguro?' });
    await fixture.whenStable();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    const botones = [...dialog.querySelectorAll('button')];
    const aceptar = botones.find((b) => b.textContent?.includes('Aceptar'))!;
    aceptar.click();

    await expect(promise).resolves.toBe(true);

    const result = await promise;
    expect(result).toBe(true);
  });

  it('al cerrar el diálogo con close(false) se resuelve la promesa con false', async () => {
    const fixture = TestBed.createComponent(ConfirmDialog);
    const confirm = TestBed.inject(ConfirmService);
    const promise = confirm.ask({ title: 'Borrar pedido', message: '¿Seguro?' });
    await fixture.whenStable();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    const botones = [...dialog.querySelectorAll('button')];
    const cancelar = botones.find((b) => b.textContent?.includes('Cancelar'))!;
    cancelar.click();

    await expect(promise).resolves.toBe(false);
  });

  it('al pulsar ESC se cierra el diálogo y se resuelve la promesa con false', async () => {
    const fixture = TestBed.createComponent(ConfirmDialog);
    const confirm = TestBed.inject(ConfirmService);
    const promise = confirm.ask({ title: 'Borrar pedido', message: '¿Seguro?' });
    await fixture.whenStable();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));

    await fixture.whenStable();
    const result = await promise;
    expect(result).toBe(false);
  });

  it('con danger=true el botón de aceptar es rojo', async () => {
    const fixture = TestBed.createComponent(ConfirmDialog);
    const confirm = TestBed.inject(ConfirmService);
    void confirm.ask({ title: 'Borrar pedido', message: '¿Seguro?', danger: true });
    await fixture.whenStable();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    const acceptButton = dialog.querySelector('button.btn-error')!;
    expect(acceptButton.classList).toContain('btn-error');
  });

  it('con danger=false el botón de aceptar es azul', async () => {
    const fixture = TestBed.createComponent(ConfirmDialog);
    const confirm = TestBed.inject(ConfirmService);
    void confirm.ask({ title: 'Borrar pedido', message: '¿Seguro?', danger: false });
    await fixture.whenStable();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    const acceptButton = dialog.querySelector('button.btn-primary')!;
    expect(acceptButton.classList).not.toContain('btn-error');
  });

  it('confirmTest: borrar, el botón de aceptar dice "Borrar"', async () => {
    const fixture = TestBed.createComponent(ConfirmDialog);
    const confirm = TestBed.inject(ConfirmService);
    void confirm.ask({ title: 'Borrar pedido', message: '¿Seguro?', confirmText: 'Borrar' });
    await fixture.whenStable();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    const acceptButton = dialog.querySelector('button.btn-primary')!;
    expect(acceptButton.textContent).toContain('Borrar');
  });
});
