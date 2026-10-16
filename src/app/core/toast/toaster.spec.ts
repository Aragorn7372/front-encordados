import { TestBed } from '@angular/core/testing';
import { Toaster } from './toaster';
import { ToastService } from './toast.service';

describe('Toaster', () => {
  it('pinta un .alert por cada toast con su clase de color', async () => {
    const fixture = TestBed.createComponent(Toaster);
    const service = TestBed.inject(ToastService);

    service.success('Guardado');
    service.error('Ha fallado');
    await fixture.whenStable(); // espera a que Angular repinte (zoneless)

    const alerts = (fixture.nativeElement as HTMLElement).querySelectorAll('.alert');
    expect(alerts).toHaveLength(2);
    expect(alerts[0].textContent).toContain('Guardado');
    expect(alerts[0].classList).toContain('alert-success');
    expect(alerts[1].classList).toContain('alert-error');
  });

  it('al hacer click en el botón de cerrar, se elimina el toast', async () => {
    const fixture = TestBed.createComponent(Toaster);
    const service = TestBed.inject(ToastService);
    service.info('Cierra esto');
    await fixture.whenStable();
    const closeButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Cerrar"]',
    );
    expect(closeButton).not.toBeNull();

    closeButton!.click();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.alert')).toHaveLength(0);
  });

  it('sin toasts, no pinta nada', async () => {
    const fixture = TestBed.createComponent(Toaster);
    await fixture.whenStable();
    const alerts = (fixture.nativeElement as HTMLElement).querySelectorAll('.alert');
    expect(alerts).toHaveLength(0);
  });

  it('toasts tiene role="alert" para que los lectores de pantalla los lean', async () => {
    const fixture = TestBed.createComponent(Toaster);
    const service = TestBed.inject(ToastService);
    service.info('Accesibilidad');
    await fixture.whenStable();
    const alert = (fixture.nativeElement as HTMLElement).querySelector('.alert');
    expect(alert?.getAttribute('role')).toBe('alert');
  });
});
