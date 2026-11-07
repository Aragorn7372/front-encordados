import { PedidoLineaDto, PurchasedDto } from '../dto/pedido.dto';
import { OP_PEDIDO } from '../model/pedido-operacion.model';
import { aplicarPendientes, describir, idsCreados, vistaPrevia } from './pedido-pendiente';
import { toPedido } from './pedido.mapper';
import { PurchasedRequest } from './pedido-request';

const linea = (raquetModel: string, extra: Partial<PedidoLineaDto> = {}) => ({
  raquetModel,
  nudos: 2,
  dateString: '2026-06-02T10:00:00.000Z',
  logotype: false,
  color: '',
  stringSetup: {
    stringV: 'RPM',
    tensionV: 24,
    preStetchV: 0,
    stringH: 'RPM',
    tensionH: 24,
    preStetchH: 0,
  },
  ...extra,
});

const request: PurchasedRequest = {
  tournamentId: 't1',
  playerName: 'ana',
  assignedToName: 'carlos',
  machine: 'M-1',
  comments: '',
  payStatus: 'PENDING_PAYMENT',
  price: 30,
  lineas: [linea('Pure Aero'), linea('Blade')],
};
const ana = { username: 'ana', name: 'Ana', bonos: 0 };
const carlos = { username: 'carlos', name: 'Carlos' };

const servidor = (id: string, lineas: { id: string; raquetModel: string; status?: string }[]) =>
  toPedido({
    id,
    tournamentId: 't1',
    player: { ...ana, imageUrl: '' },
    encorder: { ...carlos, imageUrl: '', bonos: 0 },
    machine: 'M-1',
    comments: '',
    payStatus: 'PENDING_PAYMENT',
    createdAt: '',
    updatedAt: '',
    price: 30,
    lineas: lineas.map((l) => ({
      ...linea(l.raquetModel),
      id: l.id,
      status: l.status ?? 'PENDING',
    })),
  } as PurchasedDto);

const op = (tipo: string, payload: unknown) => ({ tipo, payload });

describe('vistaPrevia', () => {
  it('es el pedido como lo devolvería el servidor, con ids temporales suyos', () => {
    const vista = vistaPrevia(request, 'tmp-1', ana, carlos, '2026-06-01T00:00:00Z');

    expect(vista.id).toBe('tmp-1');
    expect(vista.lineas.map((l) => [l.id, l.status])).toEqual([
      ['tmp-1~0', 'PENDING'],
      ['tmp-1~1', 'PENDING'],
    ]);
    expect(vista.player.name).toBe('Ana');
    expect(vista.payStatus).toBe('PENDING_PAYMENT');
  });

  it('si los bonos alcanzan se ve pagado, como hará el backend', () => {
    expect(vistaPrevia(request, 'tmp-1', { ...ana, bonos: 50 }, carlos).payStatus).toBe('PAID');
  });
});

describe('idsCreados', () => {
  it('empareja las raquetas por contenido, aunque el servidor las devuelva en otro orden', () => {
    const vista = vistaPrevia(request, 'tmp-1', ana, carlos);
    const real = servidor('p1', [
      { id: 'l-blade', raquetModel: 'Blade' },
      { id: 'l-aero', raquetModel: 'Pure Aero' },
    ]);

    expect(idsCreados({ tempId: 'tmp-1', request, vista }, real)).toEqual({
      'tmp-1': 'p1',
      'tmp-1~0': 'l-aero',
      'tmp-1~1': 'l-blade',
    });
  });
});

describe('aplicarPendientes', () => {
  const base = [
    servidor('a', [
      { id: 'a-1', raquetModel: 'Pure Aero' },
      { id: 'a-2', raquetModel: 'Blade', status: 'COMPLETED' },
    ]),
  ];

  it('sin cambios pendientes deja la lista igual', () => {
    expect(aplicarPendientes(base, [], {})).toBe(base);
  });

  it('cambiar el estado de una raqueta recalcula el pedido', () => {
    const [pedido] = aplicarPendientes(
      base,
      [op(OP_PEDIDO.estadoLinea, { pedidoId: 'a', lineaId: 'a-1', estado: 'COMPLETED' })],
      {},
    );

    expect(pedido.lineas.map((l) => l.estado)).toEqual(['COMPLETED', 'COMPLETED']);
    expect(pedido.columna).toBe('listo');
  });

  it('editar cambia máquina, pago y comentarios', () => {
    const [pedido] = aplicarPendientes(
      base,
      [
        op(OP_PEDIDO.editar, {
          pedidoId: 'a',
          cuerpo: {},
          cambios: { maquina: ' M-9 ', pago: 'PAID', comentarios: 'Suave' },
        }),
      ],
      {},
    );

    expect([pedido.maquina, pedido.pago, pedido.comentarios]).toEqual(['M-9', 'PAID', 'Suave']);
  });

  it('cancelar el pedido cancela solo lo que no está terminado, como el backend', () => {
    const [pedido] = aplicarPendientes(base, [op(OP_PEDIDO.cancelar, { pedidoId: 'a' })], {});

    expect(pedido.lineas.map((l) => l.estado)).toEqual(['CANCELED', 'COMPLETED']);
  });

  it('cancelar una raqueta deja el resto igual', () => {
    const [pedido] = aplicarPendientes(
      base,
      [op(OP_PEDIDO.cancelarLinea, { pedidoId: 'a', lineaId: 'a-1' })],
      {},
    );

    expect(pedido.lineas.map((l) => l.estado)).toEqual(['CANCELED', 'COMPLETED']);
  });

  it('un pedido creado sin conexión aparece el primero, y se le pueden aplicar más cambios', () => {
    const vista = vistaPrevia(request, 'tmp-1', ana, carlos);
    const lista = aplicarPendientes(
      base,
      [
        op(OP_PEDIDO.crear, { tempId: 'tmp-1', request, vista }),
        op(OP_PEDIDO.estadoLinea, { pedidoId: 'tmp-1', lineaId: 'tmp-1~1', estado: 'IN_PROGRESS' }),
      ],
      {},
    );

    expect(lista.map((p) => p.id)).toEqual(['tmp-1', 'a']);
    expect(lista[0].lineas.map((l) => l.estado)).toEqual(['PENDING', 'IN_PROGRESS']);
  });

  it('enviado el pedido, sus cambios pendientes se aplican sobre el real', () => {
    const vista = vistaPrevia(request, 'tmp-1', ana, carlos);
    const real = servidor('p1', [
      { id: 'l-aero', raquetModel: 'Pure Aero' },
      { id: 'l-blade', raquetModel: 'Blade' },
    ]);
    const lista = aplicarPendientes(
      [real, ...base],
      [
        op(OP_PEDIDO.crear, { tempId: 'tmp-1', request, vista }),
        op(OP_PEDIDO.estadoLinea, { pedidoId: 'tmp-1', lineaId: 'tmp-1~1', estado: 'IN_PROGRESS' }),
      ],
      { 'tmp-1': 'p1', 'tmp-1~0': 'l-aero', 'tmp-1~1': 'l-blade' },
    );

    expect(lista.map((p) => p.id)).toEqual(['p1', 'a']);
    expect(lista[0].lineas.map((l) => l.estado)).toEqual(['PENDING', 'IN_PROGRESS']);
  });

  it('un cambio de un pedido que no está en la lista se ignora', () => {
    const lista = aplicarPendientes(base, [op(OP_PEDIDO.cancelar, { pedidoId: 'otro' })], {});

    expect(lista).toEqual(base);
  });
});

describe('describir', () => {
  it('dice qué es cada cambio, para el panel de pendientes', () => {
    const [pedido] = [servidor('a', [{ id: 'a-1', raquetModel: 'Pure Aero' }])];

    expect(describir.crear(vistaPrevia(request, 'tmp-1', ana, carlos))).toBe(
      'Nuevo pedido de Ana (2 raquetas)',
    );
    expect(describir.estadoLinea(pedido, pedido.lineas[0], 'COMPLETED')).toBe(
      '«Pure Aero» de Ana: Listo',
    );
    expect(describir.cancelarLinea(pedido, pedido.lineas[0])).toBe('Cancelar «Pure Aero» de Ana');
  });
});
