import { TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';
import { ConfirmService } from './confirm.service';

describe('ConfirmDialog', () => {
  const boton = (dialog: HTMLElement, texto: string) =>
    [...dialog.querySelectorAll('button')].find((b) => b.textContent?.includes(texto))!;

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

  it('pulsar Aceptar resuelve con true y cierra el diálogo', async () => {
    const fixture = TestBed.createComponent(ConfirmDialog);
    const confirm = TestBed.inject(ConfirmService);

    const promise = confirm.ask({ title: 'Borrar pedido', message: '¿Seguro?' });
    await fixture.whenStable();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    boton(dialog, 'Aceptar').click();

    await expect(promise).resolves.toBe(true);
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
  });

  it('pulsar Cancelar resuelve con false', async () => {
    const fixture = TestBed.createComponent(ConfirmDialog);
    const confirm = TestBed.inject(ConfirmService);
    const promise = confirm.ask({ title: 'Borrar pedido', message: '¿Seguro?' });
    await fixture.whenStable();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    boton(dialog, 'Cancelar').click();

    await expect(promise).resolves.toBe(false);
  });

  it('Esc resuelve con false', async () => {
    const fixture = TestBed.createComponent(ConfirmDialog);
    const confirm = TestBed.inject(ConfirmService);
    const promise = confirm.ask({ title: 'Borrar pedido', message: '¿Seguro?' });
    await fixture.whenStable();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));

    await expect(promise).resolves.toBe(false);
  });

  it('con danger=true el botón de aceptar es rojo', async () => {
    const fixture = TestBed.createComponent(ConfirmDialog);
    const confirm = TestBed.inject(ConfirmService);
    void confirm.ask({ title: 'Borrar pedido', message: '¿Seguro?', danger: true });
    await fixture.whenStable();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    expect(boton(dialog, 'Aceptar').classList).toContain('btn-error');
  });

  it('sin danger el botón de aceptar es primary', async () => {
    const fixture = TestBed.createComponent(ConfirmDialog);
    const confirm = TestBed.inject(ConfirmService);
    void confirm.ask({ title: 'Borrar pedido', message: '¿Seguro?', danger: false });
    await fixture.whenStable();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    expect(boton(dialog, 'Aceptar').classList).toContain('btn-primary');
  });

  it('confirmText cambia el texto del botón de confirmar', async () => {
    const fixture = TestBed.createComponent(ConfirmDialog);
    const confirm = TestBed.inject(ConfirmService);
    void confirm.ask({ title: 'Borrar pedido', message: '¿Seguro?', confirmText: 'Borrar' });
    await fixture.whenStable();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    const botones = dialog.querySelectorAll('button');
    expect(botones[botones.length - 1].textContent).toContain('Borrar');
  });
});
