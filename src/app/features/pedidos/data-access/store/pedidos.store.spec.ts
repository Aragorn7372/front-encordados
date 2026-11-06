import { signal } from '@angular/core';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { AuthStore } from '../../../../core/auth/store/auth.store';
import { TournamentNotification } from '../../../../core/realtime/realtime.models';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { TournamentContext } from '../../../../core/tournament-context/tournament-context';
import { Role } from '../../../../shared/models/roles';
import { tarjetasDe, toPedido } from '../mapper/pedido.mapper';
import { Pedido } from '../model/pedido.model';
import { PedidosApi } from '../api/pedidos.api';
import { PedidosStore } from './pedidos.store';

const pedido = (id: string, overrides: Partial<Pedido> = {}) =>
  ({ id, estado: 'PENDING', columna: 'proceso', ...overrides }) as Pedido;

const usuario = (username: string) => ({ username, name: username, imageUrl: '', bonos: 0 });

const lineaDto = (id: string, status: number | string = 'PENDING') => ({
  id,
  raquetModel: 'Pure Aero',
  nudos: 2,
  dateString: '2026-06-02T10:00:00Z',
  logotype: false,
  color: '',
  status,
  stringSetup: {
    stringV: 'A',
    tensionV: 25,
    preStetchV: 0,
    stringH: 'B',
    tensionH: 25,
    preStetchH: 0,
  },
});

const dto = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  tournamentId: 't1',
  player: usuario('ana'),
  encorder: usuario('carlos'),
  machine: '',
  comments: '',
  payStatus: 'PAID',
  createdAt: '',
  updatedAt: '',
  price: 10,
  lineas: [lineaDto(`${id}-1`)],
  ...overrides,
});

describe('PedidosStore', () => {
  const selectedId = signal<string | null>('t1');
  const events$ = new Subject<TournamentNotification>();
  const reconnected$ = new Subject<void>();
  const api = {
    list: vi.fn(() => of({ pedidos: [pedido('a'), pedido('b')], total: 2 })),
    changeLineStatus: vi.fn((id: string, status: string) => of(lineaDto(id, status))),
  };

  const setup = async (role: Role) => {
    TestBed.configureTestingModule({
      providers: [
        PedidosStore,
        { provide: PedidosApi, useValue: api },
        { provide: TournamentContext, useValue: { selectedId } },
        { provide: RealtimeService, useValue: { events$, reconnected$ } },
        {
          provide: AuthStore,
          useValue: {
            hasRole: (...roles: Role[]) => roles.includes(role),
            username: () => 'carlos',
          },
        },
      ],
    });
    const store = TestBed.inject(PedidosStore);
    await TestBed.inject(ApplicationRef).whenStable();
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    selectedId.set('t1');
  });

  it('carga los pedidos del torneo activo', async () => {
    const store = await setup('OWNER');

    expect(api.list).toHaveBeenCalledWith('t1');
    expect(store.pedidos()).toHaveLength(2);
  });

  it('OWNER sin torneo no pide nada, porque el backend respondería 403', async () => {
    selectedId.set(null);
    const store = await setup('OWNER');

    expect(api.list).not.toHaveBeenCalled();
    expect(store.needsTournament()).toBe(true);
  });

  it('ADMIN puede ver todos los pedidos sin elegir torneo', async () => {
    selectedId.set(null);
    await setup('ADMIN');

    expect(api.list).toHaveBeenCalledWith(null);
  });

  it('USER ve sus pedidos aunque haya un torneo seleccionado', async () => {
    await setup('USER');

    expect(api.list).toHaveBeenCalledWith(null);
  });

  describe('mover raquetas', () => {
    /** Un pedido de dos raquetas pendientes. */
    const conDos = async () => {
      api.list.mockReturnValueOnce(
        of({
          pedidos: [toPedido(dto('a', { lineas: [lineaDto('a-1'), lineaDto('a-2')] }) as never)],
          total: 1,
        }),
      );
      const store = await setup('OWNER');
      return { store, tarjetas: () => tarjetasDe(store.pedidos()[0]) };
    };
    const estados = (store: PedidosStore) => store.pedidos()[0].lineas.map((l) => l.estado);

    it('mueve solo esa raqueta, antes de que responda el servidor', async () => {
      const { store, tarjetas } = await conDos();

      const move = store.move(tarjetas()[0], 'listo');

      expect(estados(store)).toEqual(['COMPLETED', 'PENDING']);
      expect(api.changeLineStatus).toHaveBeenCalledWith('a-1', 'COMPLETED');
      await move;
    });

    it('se queda con la línea que devuelve el servidor', async () => {
      api.changeLineStatus.mockReturnValueOnce(of(lineaDto('a-1', 'IN_PROGRESS')));
      const { store, tarjetas } = await conDos();

      await store.move(tarjetas()[0], 'listo');

      expect(estados(store)).toEqual(['IN_PROGRESS', 'PENDING']);
    });

    it('si el servidor falla, la raqueta vuelve a su sitio', async () => {
      api.changeLineStatus.mockReturnValueOnce(throwError(() => ({ status: 500 })));
      const { store, tarjetas } = await conDos();

      await store.move(tarjetas()[0], 'listo');

      expect(estados(store)).toEqual(['PENDING', 'PENDING']);
    });

    it('el fallo de una raqueta no deshace el movimiento de otra del mismo pedido', async () => {
      api.changeLineStatus.mockReturnValueOnce(throwError(() => ({ status: 500 })));
      const { store, tarjetas } = await conDos();
      const [primera, segunda] = tarjetas();

      const fallida = store.move(primera, 'listo');
      await store.move(segunda, 'listo');
      await fallida;

      expect(estados(store)).toEqual(['PENDING', 'COMPLETED']);
    });

    it('soltar en la misma columna no hace nada', async () => {
      const { store, tarjetas } = await conDos();

      await store.move(tarjetas()[0], 'pendiente');

      expect(api.changeLineStatus).not.toHaveBeenCalled();
    });

    it('una raqueta cancelada no se puede mover', async () => {
      api.list.mockReturnValueOnce(
        of({ pedidos: [toPedido(dto('a', { lineas: [lineaDto('a-1', 3)] }) as never)], total: 1 }),
      );
      const store = await setup('OWNER');

      await store.move(tarjetasDe(store.pedidos()[0])[0], 'listo');

      expect(api.changeLineStatus).not.toHaveBeenCalled();
    });
  });

  describe('tiempo real', () => {
    const emit = (tipo: TournamentNotification['tipo'], purchased: unknown, pedidoId = 'x') =>
      events$.next({ tipo, purchased, pedidoId, tournamentId: 't1', timestamp: '' });

    const conPedido = async (role: Role = 'OWNER') => {
      api.list.mockReturnValueOnce(of({ pedidos: [toPedido(dto('a') as never)], total: 1 }));
      return setup(role);
    };

    it('un pedido nuevo aparece el primero', async () => {
      const store = await conPedido();

      emit('PEDIDO_CREADO', dto('nuevo'));

      expect(store.pedidos().map((p) => p.id)).toEqual(['nuevo', 'a']);
    });

    it('recibir dos veces el mismo pedido no lo duplica', async () => {
      const store = await conPedido();

      emit('PEDIDO_CREADO', dto('nuevo'));
      emit('PEDIDO_CREADO', dto('nuevo'));

      expect(store.pedidos()).toHaveLength(2);
    });

    it('ignora los pedidos de otro torneo', async () => {
      const store = await conPedido();

      emit('PEDIDO_CREADO', dto('ajeno', { tournamentId: 't2' }));

      expect(store.pedidos().map((p) => p.id)).toEqual(['a']);
    });

    it('un pedido actualizado sustituye a la tarjeta sin moverla', async () => {
      const store = await conPedido();
      emit('PEDIDO_CREADO', dto('b'));

      emit('PEDIDO_ACTUALIZADO', dto('a', { machine: 'M-9' }));

      expect(store.pedidos().map((p) => p.id)).toEqual(['b', 'a']);
      expect(store.pedidos()[1].maquina).toBe('M-9');
    });

    it('un pedido cancelado pasa a la columna de cerrados', async () => {
      const store = await conPedido();

      emit('PEDIDO_CANCELADO', dto('a', { lineas: [lineaDto('a-1', 3)] }));

      expect(store.pedidos()[0].columna).toBe('cerrado');
    });

    it('un evento de línea solo trae la línea y recalcula el pedido', async () => {
      const store = await conPedido();

      emit('ESTATUS_LINEA_PEDIDO_ACTUALIZADA', lineaDto('a-1', 2), 'a');

      expect(store.pedidos()[0].columna).toBe('listo');
    });

    it('un evento de línea de un pedido que no está aquí se ignora', async () => {
      const store = await conPedido();

      emit('LINEA_PEDIDO_ACTUALIZADA', lineaDto('z-1', 2), 'z');

      expect(store.pedidos().map((p) => p.id)).toEqual(['a']);
    });

    it('ENCORDER solo recibe lo que tiene asignado', async () => {
      const store = await conPedido('ENCORDER');

      emit('PEDIDO_CREADO', dto('suyo'));
      emit('PEDIDO_CREADO', dto('ajeno', { encorder: usuario('maria') }));

      expect(store.pedidos().map((p) => p.id)).toEqual(['suyo', 'a']);
    });

    it('si le reasignan el pedido a otro, desaparece de su vista', async () => {
      const store = await conPedido('ENCORDER');

      emit('PEDIDO_ACTUALIZADO', dto('a', { encorder: usuario('maria') }));

      expect(store.pedidos()).toHaveLength(0);
    });

    it('al recuperar la conexión recarga, porque ha podido perder eventos', async () => {
      await setup('OWNER');
      api.list.mockClear();

      reconnected$.next();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(api.list).toHaveBeenCalledTimes(1);
    });

    it('deja de escuchar al destruirse la pantalla', async () => {
      await conPedido();
      expect(events$.observed).toBe(true);

      TestBed.resetTestingModule();

      expect(events$.observed).toBe(false);
    });
  });
});
