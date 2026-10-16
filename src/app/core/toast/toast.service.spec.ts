import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers(); // a partir de aquí, setTimeout no avanza solo
    service = TestBed.inject(ToastService);
  });

  afterEach(() => vi.useRealTimers()); // dejarlo como estaba para otros tests

  it('show() añade un toast con su mensaje y tipo', () => {
    service.show('Hola', 'info');

    expect(service.toasts()).toEqual([{ id: 1, message: 'Hola', type: 'info' }]);
  });

  it('el toast desaparece solo a los 4 segundos', () => {
    service.show('Hola');

    vi.advanceTimersByTime(3999); // casi...
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1); // ...ya
    expect(service.toasts()).toHaveLength(0);
  });

  it('success() añade un toast de tipo success', () => {
    service.success('¡Bien!');
    expect(service.toasts()).toEqual([{ id: 1, message: '¡Bien!', type: 'success' }]);
  });

  it('error() añade un toast de tipo error', () => {
    service.error('¡Error!');
    expect(service.toasts()).toEqual([{ id: 1, message: '¡Error!', type: 'error' }]);
  });

  it('warning() añade un toast de tipo warning', () => {
    service.warning('¡Advertencia!');
    expect(service.toasts()).toEqual([{ id: 1, message: '¡Advertencia!', type: 'warning' }]);
  });

  it('info() añade un toast de tipo info', () => {
    service.info('¡Info!');
    expect(service.toasts()).toEqual([{ id: 1, message: '¡Info!', type: 'info' }]);
  });
  it('dismiss() elimina un toast por su id', () => {
    service.show('Hola');
    service.show('Adiós');
    service.dismiss(1);
    expect(service.toasts()).toEqual([{ id: 2, message: 'Adiós', type: 'info' }]);
  });

  it('warning() duration 5000ms', () => {
    service.warning('¡Advertencia!');
    vi.advanceTimersByTime(4999);
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(service.toasts()).toHaveLength(0);
  });
  it('error() duration 6000ms', () => {
    service.error('¡Error!');
    vi.advanceTimersByTime(5999);
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(service.toasts()).toHaveLength(0);
  });
  it('info() duration 4000ms', () => {
    service.info('¡Info!');
    vi.advanceTimersByTime(3999);
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(service.toasts()).toHaveLength(0);
  });
  it('diferent toasts have different ids', () => {
    service.show('Toast 1');
    service.show('Toast 2');
    const toasts = service.toasts();
    expect(toasts[0].id).not.toEqual(toasts[1].id);
  });
});
