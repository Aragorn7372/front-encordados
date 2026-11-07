import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideEscriturasDirectas } from '../data-access/store/pedidos-escrituras.testing';
import { of } from 'rxjs';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { Pedido } from '../data-access/model/pedido.model';
import { PedidosApi } from '../data-access/api/pedidos.api';
import { PedidoDetalle } from './pedido-detalle';

const usuario = (username: string) => ({ username, name: username, imageUrl: '', bonos: 0 });

const pedido = {
  id: 'p1',
  tournamentId: 't1',
  tipo: 'encordado',
  jugador: usuario('Ana'),
  encordador: usuario('Carlos'),
  maquina: 'M-1',
  comentarios: 'Tensar suave',
  materialPropio: false,
  pago: 'PENDING_PAYMENT',
  precio: 18,
  creadoEn: '2026-06-01T10:00:00Z',
  requeridoEn: null,
  estado: 'PENDING',
  columna: 'pendiente',
  lineas: [],
} as unknown as Pedido;

describe('PedidoDetalle', () => {
  const api = { update: vi.fn(() => of({ ...pedido, maquina: 'M-2' })) };
  let fixture: ComponentFixture<PedidoDetalle>;
  let changed: Pedido[];

  const element = () => fixture.nativeElement as HTMLElement;
  const lapiz = () => element().querySelector<HTMLButtonElement>('[aria-label="Editar pedido"]');

  const render = async (canManage = true, datos: Partial<Pedido> = {}) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PedidosApi, useValue: api },
        provideEscriturasDirectas(api),
        { provide: ConfirmService, useValue: { ask: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(PedidoDetalle);
    fixture.componentRef.setInput('pedido', { ...pedido, ...datos });
    fixture.componentRef.setInput('canManage', canManage);
    changed = [];
    fixture.componentInstance.changed.subscribe((p) => changed.push(p));
    await fixture.whenStable();
  };

  beforeEach(() => vi.clearAllMocks());

  it('muestra todo sin entrar a editar: máquina, pago y comentarios', async () => {
    await render();

    const texto = element().textContent!;
    expect(texto).toContain('M-1');
    expect(texto).toContain('Pago pendiente');
    expect(texto).toContain('Tensar suave');
    expect(element().querySelector('#edit-maquina')).toBeNull();
  });

  it('sin comentarios lo dice', async () => {
    await render(true, { comentarios: '' });
    expect(element().textContent).toContain('Sin comentarios');
  });

  it('el lápiz pone en edición esos mismos campos, y Cancelar vuelve a la vista', async () => {
    await render();

    lapiz()!.click();
    await fixture.whenStable();

    expect(element().querySelector<HTMLInputElement>('#edit-maquina')!.value).toBe('M-1');
    expect(element().querySelector<HTMLTextAreaElement>('#edit-comentarios')!.value).toBe(
      'Tensar suave',
    );
    expect(lapiz()).toBeNull();

    [...element().querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Cancelar')!
      .click();
    await fixture.whenStable();

    expect(element().querySelector('#edit-maquina')).toBeNull();
    expect(changed).toHaveLength(0);
  });

  it('al guardar sale de la edición y entrega el pedido actualizado', async () => {
    await render();
    lapiz()!.click();
    await fixture.whenStable();

    element()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    expect(changed[0].maquina).toBe('M-2');
    expect(element().querySelector('#edit-maquina')).toBeNull();
  });

  it('quien no gestiona ve los datos pero no el lápiz', async () => {
    await render(false);

    expect(element().textContent).toContain('Tensar suave');
    expect(lapiz()).toBeNull();
  });

  it('al pasar a otro pedido sale del modo edición', async () => {
    await render();
    lapiz()!.click();
    await fixture.whenStable();

    fixture.componentRef.setInput('pedido', { ...pedido, id: 'p2' });
    await fixture.whenStable();

    expect(element().querySelector('#edit-maquina')).toBeNull();
  });
});
