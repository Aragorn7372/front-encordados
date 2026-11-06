import { LineStatus, estadoPedido } from '../../../../shared/models/status';
import { PedidoLineaDto, PurchasedDto } from '../dto/pedido.dto';
import {
  coincideBusqueda,
  coincideTarjeta,
  columnaDe,
  tarjetasDe,
  conLinea,
  lineaCancelable,
  pedidoCancelable,
  toComments,
  esUrgente,
  estadoDestino,
  toPedido,
} from './pedido.mapper';

const setup = {
  stringV: 'RPM Blast',
  tensionV: 25,
  preStetchV: 5,
  stringH: 'Xcel',
  tensionH: 24,
  preStetchH: 10,
};

const linea = (overrides: Partial<PedidoLineaDto> = {}): PedidoLineaDto => ({
  id: 'l1',
  raquetModel: 'Pure Aero',
  nudos: 2,
  dateString: '2026-06-02T10:00:00Z',
  logotype: true,
  color: 'Azul',
  status: 'PENDING',
  stringSetup: setup,
  ...overrides,
});

const usuario = (username: string) => ({ username, imageUrl: '', name: username, bonos: 0 });

const pedido = (overrides: Partial<PurchasedDto> = {}): PurchasedDto => ({
  id: 'p1',
  tournamentId: 't1',
  player: usuario('ana'),
  encorder: usuario('carlos'),
  machine: 'M-1',
  comments: 'Tensar suave',
  payStatus: 'PAID',
  createdAt: '2026-06-01T10:00:00Z',
  updatedAt: '2026-06-01T10:00:00Z',
  price: 35,
  lineas: [linea()],
  ...overrides,
});

const taller = (color: string, stringV = 'Mañana') =>
  linea({
    raquetModel: 'Overgrip',
    color,
    stringSetup: { ...setup, stringV, stringH: 'ORDEN_DE_TALLER' },
  });

describe('toPedido', () => {
  it('traduce una línea de encordado', () => {
    expect(toPedido(pedido()).lineas[0]).toMatchObject({
      tipo: 'encordado',
      raqueta: 'Pure Aero',
      logo: true,
      vertical: { cuerda: 'RPM Blast', tension: 25, preestirado: 5 },
      horizontal: { cuerda: 'Xcel', tension: 24, preestirado: 10 },
    });
  });

  it('detecta un pedido de taller y decodifica cantidad y notas', () => {
    const result = toPedido(pedido({ lineas: [taller('Cant: 3 | color negro')] }));

    expect(result.tipo).toBe('taller');
    expect(result.lineas[0]).toMatchObject({
      tipo: 'taller',
      articulo: 'Overgrip',
      cantidad: 3,
      notas: 'color negro',
      cuando: 'Mañana',
    });
  });

  it('acepta una cantidad sin notas', () => {
    expect(toPedido(pedido({ lineas: [taller('Cant: 2')] })).lineas[0]).toMatchObject({
      cantidad: 2,
      notas: '',
    });
  });

  it('un texto con otro formato no se pierde: queda como notas', () => {
    expect(toPedido(pedido({ lineas: [taller('dos unidades')] })).lineas[0]).toMatchObject({
      cantidad: 1,
      notas: 'dos unidades',
    });
  });

  it('el N/A del "cuándo" no se muestra', () => {
    expect(toPedido(pedido({ lineas: [taller('Cant: 1', 'N/A')] })).lineas[0]).toMatchObject({
      cuando: '',
    });
  });

  it('separa la marca de material propio de los comentarios', () => {
    const result = toPedido(pedido({ comments: '[MATERIAL PROPIO] Tensar suave' }));

    expect(result.materialPropio).toBe(true);
    expect(result.comentarios).toBe('Tensar suave');
  });

  it('sin marca no hay material propio', () => {
    expect(toPedido(pedido()).materialPropio).toBe(false);
  });

  it('la fecha requerida es la más próxima de sus líneas', () => {
    const result = toPedido(
      pedido({
        lineas: [
          linea({ id: 'a', dateString: '2026-06-05T10:00:00Z' }),
          linea({ id: 'b', dateString: '2026-06-03T10:00:00Z' }),
        ],
      }),
    );

    expect(result.requeridoEn).toBe('2026-06-03T10:00:00Z');
  });

  it('un pedido sin líneas no rompe', () => {
    expect(toPedido(pedido({ lineas: [] }))).toMatchObject({
      tipo: 'encordado',
      requeridoEn: null,
      columna: 'pendiente',
    });
  });
});

describe('estadoPedido', () => {
  it.each<[LineStatus[], LineStatus]>([
    [['PENDING', 'PENDING'], 'PENDING'],
    [['PENDING', 'IN_PROGRESS'], 'IN_PROGRESS'],
    [['PENDING', 'COMPLETED'], 'IN_PROGRESS'],
    [['COMPLETED', 'COMPLETED'], 'COMPLETED'],
    [['COMPLETED', 'DELIVERED_TOpLAYER'], 'COMPLETED'],
    [['DELIVERED_TOpLAYER', 'DELIVERED_TOpLAYER'], 'DELIVERED_TOpLAYER'],
    [['CANCELED', 'CANCELED'], 'CANCELED'],
    [[], 'PENDING'],
  ])('%j → %s', (estados, esperado) => {
    expect(estadoPedido(estados)).toBe(esperado);
  });

  it('una línea cancelada no arrastra al pedido, sea cual sea su posición', () => {
    expect(estadoPedido(['CANCELED', 'COMPLETED'])).toBe('COMPLETED');
    expect(estadoPedido(['COMPLETED', 'CANCELED'])).toBe('COMPLETED');
  });
});

describe('columnas', () => {
  it.each<[LineStatus, string]>([
    ['PENDING', 'pendiente'],
    ['IN_PROGRESS', 'proceso'],
    ['COMPLETED', 'listo'],
    ['DELIVERED_TOpLAYER', 'cerrado'],
    ['CANCELED', 'cerrado'],
  ])('%s va a %s', (estado, columna) => {
    expect(columnaDe(estado)).toBe(columna);
  });

  it('el destino de cada columna vuelve a esa misma columna', () => {
    for (const columna of ['pendiente', 'proceso', 'listo', 'cerrado'] as const) {
      expect(columnaDe(estadoDestino(columna))).toBe(columna);
    }
  });
});

describe('datos que llegan por SignalR', () => {
  it('entiende el estado numérico de los eventos', () => {
    const result = toPedido(pedido({ lineas: [linea({ status: 2 })] }));

    expect(result.estado).toBe('COMPLETED');
    expect(result.columna).toBe('listo');
  });

  it.each<[number, LineStatus]>([
    [0, 'PENDING'],
    [1, 'IN_PROGRESS'],
    [2, 'COMPLETED'],
    [3, 'CANCELED'],
    [4, 'DELIVERED_TOpLAYER'],
  ])('el valor %i del enum es %s', (valor, esperado) => {
    expect(toPedido(pedido({ lineas: [linea({ status: valor })] })).lineas[0].estado).toBe(
      esperado,
    );
  });

  it('conLinea recalcula el estado y la columna del pedido', () => {
    const base = toPedido(
      pedido({
        lineas: [linea({ id: 'a', status: 'COMPLETED' }), linea({ id: 'b', status: 'PENDING' })],
      }),
    );
    expect(base.columna).toBe('proceso');

    const result = conLinea(base, linea({ id: 'b', status: 2 }));

    expect(result.estado).toBe('COMPLETED');
    expect(result.columna).toBe('listo');
  });

  it('conLinea ignora una línea que no es del pedido', () => {
    const base = toPedido(pedido());

    expect(conLinea(base, linea({ id: 'otra', status: 2 })).lineas).toEqual(base.lineas);
  });
});

describe('toComments', () => {
  it('conserva la marca de material propio al editar', () => {
    expect(toComments('Tensar suave', true)).toBe('[MATERIAL PROPIO] Tensar suave');
  });

  it('sin material propio no añade nada', () => {
    expect(toComments('  Tensar suave ', false)).toBe('Tensar suave');
  });

  it('ida y vuelta: lo que se guarda se vuelve a leer igual', () => {
    const leido = toPedido(pedido({ comments: toComments('Tensar suave', true) }));
    expect(leido.materialPropio).toBe(true);
    expect(leido.comentarios).toBe('Tensar suave');
  });
});

describe('cancelación', () => {
  it.each<[LineStatus, boolean]>([
    ['PENDING', true],
    ['IN_PROGRESS', true],
    ['COMPLETED', false],
    ['DELIVERED_TOpLAYER', false],
    ['CANCELED', false],
  ])('una línea %s se puede cancelar: %s', (estado, esperado) => {
    expect(lineaCancelable(estado)).toBe(esperado);
  });

  it('un pedido se puede cancelar si queda alguna línea sin terminar', () => {
    const mixto = toPedido(
      pedido({
        lineas: [linea({ id: 'a', status: 'COMPLETED' }), linea({ id: 'b', status: 'PENDING' })],
      }),
    );
    const terminado = toPedido(pedido({ lineas: [linea({ status: 'DELIVERED_TOpLAYER' })] }));

    expect(pedidoCancelable(mixto)).toBe(true);
    expect(pedidoCancelable(terminado)).toBe(false);
  });
});

describe('coincideBusqueda', () => {
  const resultado = toPedido(
    pedido({
      player: { ...usuario('ana_p'), name: 'Ana Pérez' },
      comments: 'Tensar suave',
      machine: 'Máquina 7',
    }),
  );

  it.each(['ana', 'ANA', 'perez', 'Pérez', 'ana_p', 'carlos', 'maquina', 'suave', 'pure aero'])(
    'encuentra "%s"',
    (termino) => {
      expect(coincideBusqueda(resultado, termino)).toBe(true);
    },
  );

  it('no encuentra lo que no está', () => {
    expect(coincideBusqueda(resultado, 'wilson')).toBe(false);
  });

  it('sin texto coincide todo', () => {
    expect(coincideBusqueda(resultado, '   ')).toBe(true);
  });

  it('busca también en los artículos de taller', () => {
    expect(coincideBusqueda(toPedido(pedido({ lineas: [taller('Cant: 1')] })), 'overgrip')).toBe(
      true,
    );
  });
});

describe('tarjetas del tablero', () => {
  const doble = toPedido(
    pedido({
      lineas: [
        linea({ id: 'a', status: 'COMPLETED' }),
        linea({ id: 'b', raquetModel: 'Blade 98', stringSetup: { ...setup, stringV: 'Hyper-G' } }),
      ],
    }),
  );

  it('una por raqueta, cada una en la columna de su estado', () => {
    const tarjetas = tarjetasDe(doble);

    expect(tarjetas.map((t) => [t.linea.id, t.columna, t.numero, t.total])).toEqual([
      ['a', 'listo', 1, 2],
      ['b', 'pendiente', 2, 2],
    ]);
    expect(tarjetas[0].pedido).toBe(doble);
  });

  it('buscar una raqueta no saca las demás del mismo pedido', () => {
    const [a, b] = tarjetasDe(doble);

    expect(coincideTarjeta(a, 'blade')).toBe(false);
    expect(coincideTarjeta(b, 'blade')).toBe(true);
  });

  it('se encuentra también por el jugador y por la cuerda', () => {
    const [a, b] = tarjetasDe(doble);

    expect(coincideTarjeta(a, 'ana')).toBe(true);
    expect(coincideTarjeta(b, 'hyper')).toBe(true);
    expect(coincideTarjeta(a, 'hyper')).toBe(false);
  });
});

describe('esUrgente', () => {
  const ahora = new Date('2026-06-02T10:00:00Z').getTime();
  const conFecha = (fecha: string, status: LineStatus = 'PENDING') =>
    toPedido(pedido({ lineas: [linea({ dateString: fecha, status })] })).lineas[0];

  it('lo es si faltan 24 horas o menos', () => {
    expect(esUrgente(conFecha('2026-06-03T09:00:00Z'), ahora)).toBe(true);
    expect(esUrgente(conFecha('2026-06-03T11:00:00Z'), ahora)).toBe(false);
  });

  it('también es urgente lo que ya está en proceso', () => {
    expect(esUrgente(conFecha('2026-06-03T09:00:00Z', 'IN_PROGRESS'), ahora)).toBe(true);
  });

  it('lo retrasado también es urgente', () => {
    expect(esUrgente(conFecha('2026-06-01T10:00:00Z'), ahora)).toBe(true);
  });

  it('lo ya terminado nunca es urgente', () => {
    expect(esUrgente(conFecha('2026-06-01T10:00:00Z', 'COMPLETED'), ahora)).toBe(false);
  });
});
