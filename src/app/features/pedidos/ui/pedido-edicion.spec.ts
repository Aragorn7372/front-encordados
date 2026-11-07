import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideEscriturasDirectas } from '../data-access/store/pedidos-escrituras.testing';
import { of, throwError } from 'rxjs';
import { Pedido } from '../data-access/model/pedido.model';
import { PedidosApi } from '../data-access/api/pedidos.api';
import { PedidoEdicion } from './pedido-edicion';

const pedido = {
  id: 'p1',
  maquina: 'M-1',
  pago: 'PENDING_PAYMENT',
  comentarios: 'Suave',
  materialPropio: false,
} as Pedido;

describe('PedidoEdicion', () => {
  const api = { update: vi.fn(() => of({ ...pedido, pago: 'PAID' })) };
  let fixture: ComponentFixture<PedidoEdicion>;
  let saved: (Pedido | null)[];

  const element = () => fixture.nativeElement as HTMLElement;

  const render = async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PedidosApi, useValue: api }, provideEscriturasDirectas(api)],
    });
    fixture = TestBed.createComponent(PedidoEdicion);
    fixture.componentRef.setInput('pedido', pedido);
    saved = [];
    fixture.componentInstance.saved.subscribe((p) => saved.push(p));
    await fixture.whenStable();
  };

  const submit = async () => {
    element()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(() => vi.clearAllMocks());

  it('precarga los datos del pedido', async () => {
    await render();
    expect(element().querySelector<HTMLInputElement>('#edit-maquina')!.value).toBe('M-1');
    expect(element().querySelector<HTMLTextAreaElement>('#edit-comentarios')!.value).toBe('Suave');
  });

  it('guarda y entrega el pedido que devuelve el servidor', async () => {
    await render();
    const select = element().querySelector<HTMLSelectElement>('#edit-pago')!;
    select.value = 'PAID';
    select.dispatchEvent(new Event('input'));

    await submit();

    expect(api.update).toHaveBeenCalledWith(pedido, expect.objectContaining({ pago: 'PAID' }));
    expect(saved[0]?.pago).toBe('PAID');
  });

  it('Cancelar avisa sin guardar', async () => {
    await render();
    let cancelados = 0;
    fixture.componentInstance.cancelled.subscribe(() => cancelados++);

    [...element().querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Cancelar')!
      .click();

    expect(cancelados).toBe(1);
    expect(api.update).not.toHaveBeenCalled();
  });

  it('la máquina es obligatoria', async () => {
    await render();
    const input = element().querySelector<HTMLInputElement>('#edit-maquina')!;
    input.value = '';
    input.dispatchEvent(new Event('input'));

    await submit();

    expect(api.update).not.toHaveBeenCalled();
    expect(element().textContent).toContain('Indica la máquina');
  });

  it('muestra el error del servidor', async () => {
    api.update.mockReturnValueOnce(
      throwError(() => ({ status: 400, message: 'Estado de pago no válido', fieldErrors: {} })),
    );
    await render();

    await submit();

    expect(element().querySelector('[role=alert]')?.textContent).toContain(
      'Estado de pago no válido',
    );
    expect(saved).toHaveLength(0);
  });
});
