import { TestBed } from '@angular/core/testing';
import { ConfirmService } from './confirm.service';

describe('ConfirmService', () => {
  let service: ConfirmService;

  beforeEach(() => {
    service = TestBed.inject(ConfirmService);
  });

  it('ask() abre el diálogo con el título y el mensaje', () => {
    void service.ask({ title: 'Borrar pedido', message: '¿Seguro?' });

    expect(service.current()).toMatchObject({ title: 'Borrar pedido', message: '¿Seguro?' });
  });

  it('close(true) resuelve la promesa con true y cierra el diálogo', async () => {
    const respuesta = service.ask({ title: 'Borrar pedido', message: '¿Seguro?' });

    service.close(true);

    await expect(respuesta).resolves.toBe(true);
    expect(service.current()).toBeNull();
  });

  it('close(false) resuelve la promesa con false y cierra el diálogo', async () => {
    const respuesta = service.ask({ title: 'Borrar pedido', message: '¿Seguro?' });

    service.close(false);

    await expect(respuesta).resolves.toBe(false);
    expect(service.current()).toBeNull();
  });

  it('close() sin diálogo abierto no hace nada', () => {
    expect(() => service.close(true)).not.toThrow();
    expect(() => service.close(false)).not.toThrow();
  });

  it('second ask() cancela la primera y abre la segunda', async () => {
    const primera = service.ask({ title: 'Borrar pedido', message: '¿Seguro?' });
    const segunda = service.ask({ title: 'Borrar cliente', message: '¿Seguro?' });

    service.close(true);

    await expect(primera).resolves.toBe(false); // la primera se cancela
    await expect(segunda).resolves.toBe(true); // la segunda se resuelve
  });
});
