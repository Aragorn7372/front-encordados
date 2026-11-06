import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { of } from 'rxjs';
import { PedidosApi } from '../data-access/api/pedidos.api';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { TournamentContext } from '../../../core/tournament-context/tournament-context';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { LineStatus } from '../../../shared/models/status';
import { tarjetasDe } from '../data-access/mapper/pedido.mapper';
import { LineaPedido, Pedido } from '../data-access/model/pedido.model';
import { PedidosStore } from '../data-access/store/pedidos.store';
import { KanbanColumn } from '../ui/kanban-column';
import PedidosBoard from './pedidos-board';

const usuario = (username: string) => ({ username, name: username, imageUrl: '', bonos: 0 });

const linea = (id: string, estado: LineStatus = 'PENDING', overrides: object = {}) =>
  ({
    id,
    tipo: 'encordado',
    estado,
    fecha: '',
    raqueta: `Raqueta ${id}`,
    nudos: 2,
    logo: false,
    color: '',
    vertical: { cuerda: 'RPM', tension: 24, preestirado: 0 },
    horizontal: { cuerda: '', tension: 24, preestirado: 0 },
    ...overrides,
  }) as LineaPedido;

const pedido = (id: string, overrides: Partial<Pedido> = {}) =>
  ({
    id,
    tournamentId: 't1',
    tipo: 'encordado',
    jugador: usuario(`jugador-${id}`),
    encordador: usuario('carlos'),
    maquina: '',
    comentarios: '',
    materialPropio: false,
    precio: 18,
    pago: 'PAID',
    estado: 'PENDING',
    columna: 'pendiente',
    requeridoEn: null,
    lineas: [linea(`${id}-1`)],
    ...overrides,
  }) as unknown as Pedido;

describe('PedidosBoard', () => {
  const store = {
    pedidos: signal<Pedido[]>([]),
    total: signal(0),
    needsTournament: signal(false),
    failed: signal(false),
    loading: signal(false),
    move: vi.fn(async () => undefined),
    applyChange: vi.fn(),
    applyLine: vi.fn(),
  };
  const realtime = signal('on');
  const torneo = signal<string | null>('t1');
  const api = {
    get: vi.fn((id: string) => of(pedido(id, { jugador: usuario('remoto') }))),
    cancelLine: vi.fn((id: string) => of({ id, status: 'CANCELED' })),
    datosNuevoPedido: vi.fn(() => of({ jugadores: [], encordadores: [] })),
  };
  const confirm = { ask: vi.fn(async () => true) };
  let fixture: ComponentFixture<PedidosBoard>;

  const element = () => fixture.nativeElement as HTMLElement;

  const render = async (inputs: Record<string, unknown> = {}) => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: RealtimeService, useValue: { status: realtime } },
        { provide: PedidosApi, useValue: api },
        { provide: AuthStore, useValue: { hasRole: () => true, username: () => 'carlos' } },
        { provide: TournamentContext, useValue: { selectedId: torneo } },
        { provide: ConfirmService, useValue: confirm },
      ],
    });
    TestBed.overrideComponent(PedidosBoard, {
      set: { providers: [{ provide: PedidosStore, useValue: store }] },
    });
    fixture = TestBed.createComponent(PedidosBoard);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    await fixture.whenStable();
  };

  const columna = (index: number) =>
    fixture.debugElement.queryAll(By.directive(KanbanColumn))[index];
  const texto = (index: number) => columna(index).nativeElement.textContent as string;

  beforeEach(() => {
    vi.clearAllMocks();
    store.pedidos.set([]);
    store.total.set(0);
    store.needsTournament.set(false);
    store.failed.set(false);
    realtime.set('on');
    torneo.set('t1');
  });

  it('una tarjeta por raqueta, en la columna de su estado', async () => {
    store.pedidos.set([
      pedido('a', {
        lineas: [linea('a-1'), linea('a-2', 'IN_PROGRESS'), linea('a-3', 'COMPLETED')],
      }),
      pedido('b', { lineas: [linea('b-1', 'DELIVERED_TOpLAYER')] }),
    ]);
    await render();

    expect(texto(0)).toContain('Raqueta a-1');
    expect(texto(1)).toContain('Raqueta a-2');
    expect(texto(2)).toContain('Raqueta a-3');
    expect(texto(3)).toContain('Raqueta b-1');
    // Cada tarjeta dice de quién es y cuál de sus raquetas
    expect(texto(1)).toContain('jugador-a');
    expect(texto(1)).toContain('2/3');
  });

  it('lo más próximo va primero', async () => {
    store.pedidos.set([
      pedido('a', {
        lineas: [
          linea('tarde', 'PENDING', { fecha: '2026-06-09T10:00:00Z' }),
          linea('pronto', 'PENDING', { fecha: '2026-06-01T10:00:00Z' }),
        ],
      }),
      pedido('b', { lineas: [linea('sin-fecha')] }),
    ]);
    await render();

    const raquetas = [...columna(0).nativeElement.querySelectorAll('p.font-medium')].map((p) =>
      (p as HTMLElement).textContent?.trim(),
    );
    expect(raquetas).toEqual(['Raqueta pronto', 'Raqueta tarde', 'Raqueta sin-fecha']);
  });

  it('pide elegir torneo cuando hace falta', async () => {
    store.needsTournament.set(true);
    await render();

    expect(element().textContent).toContain('Selecciona un torneo');
    expect(element().querySelector('app-kanban-column')).toBeNull();
  });

  it('busca sobre los pedidos cargados desde la URL', async () => {
    store.pedidos.set([pedido('ana'), pedido('luis')]);
    await render({ q: 'ANA' });

    expect(element().textContent).toContain('jugador-ana');
    expect(element().textContent).not.toContain('jugador-luis');
  });

  it('buscar una raqueta deja fuera las otras del mismo pedido', async () => {
    store.pedidos.set([pedido('a', { lineas: [linea('blade'), linea('aero')] })]);
    await render({ q: 'blade' });

    expect(element().textContent).toContain('Raqueta blade');
    expect(element().textContent).not.toContain('Raqueta aero');
  });

  it('si falla la carga, los filtros siguen disponibles', async () => {
    store.failed.set(true);
    await render();

    expect(element().textContent).toContain('No se han podido cargar');
    expect(element().querySelector('input[type=search]')).not.toBeNull();
  });

  it('filtra por pago desde la URL', async () => {
    store.pedidos.set([pedido('a'), pedido('b', { pago: 'PENDING_PAYMENT' })]);
    await render({ pago: 'PENDING_PAYMENT' });

    expect(element().textContent).toContain('jugador-b');
    expect(element().textContent).not.toContain('jugador-a');
  });

  it('filtra por encordador desde la URL y deja quitar el filtro', async () => {
    store.pedidos.set([pedido('a'), pedido('b', { encordador: usuario('maria') })]);
    await render({ encordador: 'maria' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    expect(element().textContent).toContain('jugador-b');
    expect(element().textContent).not.toContain('jugador-a');

    [...element().querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Encordador: maria'))!
      .click();

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { encordador: null } }),
    );
  });

  it('avisa si hay más pedidos de los que caben en el tablero', async () => {
    store.pedidos.set([pedido('a')]);
    store.total.set(350);
    await render();

    expect(element().querySelector('[role=status]')?.textContent).toContain('350');
  });

  it('avisa si se pierde la conexión en vivo', async () => {
    realtime.set('connecting');
    await render();

    expect(element().textContent).toContain('Reconectando');
  });

  it('el jugador no ve ese aviso', async () => {
    realtime.set('off');
    await render({ readonly: true });

    expect(element().textContent).not.toContain('Reconectando');
  });

  it('abrir una tarjeta muestra el detalle de su pedido', async () => {
    store.pedidos.set([pedido('a')]);
    await render();

    columna(0).componentInstance.abierta.emit(tarjetasDe(store.pedidos()[0])[0]);
    await fixture.whenStable();

    const dialog = element().querySelector<HTMLDialogElement>('dialog[open]')!;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Pedido de jugador-a');
  });

  it('?openPedido= abre un pedido del tablero sin pedirlo otra vez', async () => {
    store.pedidos.set([pedido('a')]);
    await render({ openPedido: 'a' });

    expect(element().querySelector<HTMLDialogElement>('dialog[open]')!.textContent).toContain(
      'jugador-a',
    );
    expect(api.get).not.toHaveBeenCalled();
  });

  it('?openPedido= de un pedido que no está en el tablero lo pide al servidor', async () => {
    await render({ openPedido: 'fuera' });

    expect(api.get).toHaveBeenCalledWith('fuera');
    expect(element().querySelector<HTMLDialogElement>('dialog[open]')!.textContent).toContain(
      'remoto',
    );
  });

  it('sin torneo activo no se puede crear un pedido', async () => {
    torneo.set(null);
    await render();

    const boton = [...element().querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Nuevo pedido'),
    )!;
    expect(boton.disabled).toBe(true);
  });

  it('el jugador no ve el botón de crear', async () => {
    await render({ readonly: true });

    const textos = [...element().querySelectorAll('button')].map((b) => b.textContent);
    expect(textos.join()).not.toContain('Nuevo pedido');
  });

  it('mover una tarjeta llega al store', async () => {
    store.pedidos.set([pedido('a')]);
    await render();
    const tarjeta = tarjetasDe(store.pedidos()[0])[0];

    columna(0).componentInstance.movida.emit({ tarjeta, columna: 'listo' });

    expect(store.move).toHaveBeenCalledWith(tarjeta, 'listo');
  });

  it('en solo lectura no hay acciones sobre las tarjetas', async () => {
    store.pedidos.set([pedido('a')]);
    await render({ readonly: true });

    expect(columna(0).nativeElement.querySelector('.card-actions button')).toBeNull();
  });

  it('cancelar desde la tarjeta cancela esa raqueta, con confirmación', async () => {
    store.pedidos.set([pedido('a', { lineas: [linea('a-1'), linea('a-2')] })]);
    await render();

    columna(0).componentInstance.cancelar.emit(tarjetasDe(store.pedidos()[0])[1]);
    await fixture.whenStable();

    expect(confirm.ask).toHaveBeenCalled();
    expect(api.cancelLine).toHaveBeenCalledWith('a-2');
    expect(store.applyLine).toHaveBeenCalledWith('a', expect.objectContaining({ id: 'a-2' }));
  });

  it('si no se confirma, no se cancela', async () => {
    confirm.ask.mockResolvedValueOnce(false);
    store.pedidos.set([pedido('a')]);
    await render();

    columna(0).componentInstance.cancelar.emit(tarjetasDe(store.pedidos()[0])[0]);
    await fixture.whenStable();

    expect(api.cancelLine).not.toHaveBeenCalled();
  });

  it('repetir desde la tarjeta abre el formulario en el torneo del pedido', async () => {
    store.pedidos.set([pedido('a', { tournamentId: 't9' })]);
    await render();

    columna(0).componentInstance.repetir.emit(tarjetasDe(store.pedidos()[0])[0]);
    await fixture.whenStable();

    expect(element().querySelector('dialog[open]')?.textContent).toContain('Repetir pedido');
    expect(api.datosNuevoPedido).toHaveBeenCalledWith('t9', expect.any(Boolean));
  });
});
