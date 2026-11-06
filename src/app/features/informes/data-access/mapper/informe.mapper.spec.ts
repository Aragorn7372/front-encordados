import { PedidoInformeDto } from '../dto/informe.dto';
import { FILTROS_VACIOS, PedidoInforme } from '../model/informe.model';
import {
  diaLocal,
  filtrar,
  ingresosPorDia,
  kpis,
  pedidosPorDia,
  porEstado,
  toPedidoInforme,
  topPor,
} from './informe.mapper';

const usuario = (name: string) => ({ username: name.toLowerCase(), name, imageUrl: '' });

const dto = (overrides: Partial<PedidoInformeDto> = {}): PedidoInformeDto => ({
  id: 'p1',
  tournamentId: 't1',
  player: usuario('Juan Martínez'),
  encorder: usuario('Carlos'),
  payStatus: 'PAID',
  price: 18,
  createdAt: '2026-06-02T10:00:00',
  lineas: [{ status: 'PENDING' }],
  ...overrides,
});

const pedido = (overrides: Partial<PedidoInforme> = {}): PedidoInforme => ({
  ...toPedidoInforme(dto()),
  ...overrides,
});

describe('toPedidoInforme', () => {
  it('el estado sale de las líneas, también si llegan como número', () => {
    const p = toPedidoInforme(dto({ lineas: [{ status: 2 }, { status: 'COMPLETED' }] }));
    expect(p.estado).toBe('COMPLETED');
    expect(p.raquetas).toBe(2);
  });

  it('el día es el local, no el de UTC', () => {
    expect(diaLocal('2026-06-02T00:30:00')).toBe('2026-06-02');
  });
});

describe('filtrar', () => {
  const lista = [
    pedido({ id: 'a', dia: '2026-06-01', jugador: 'Juan Martínez', estado: 'PENDING' }),
    pedido({ id: 'b', dia: '2026-06-03', jugador: 'Ana Pérez', estado: 'COMPLETED' }),
  ];
  const ids = (filtros: Partial<typeof FILTROS_VACIOS>) =>
    filtrar(lista, { ...FILTROS_VACIOS, ...filtros }).map((p) => p.id);

  it('por fechas, incluidos los extremos', () => {
    expect(ids({ desde: '2026-06-02' })).toEqual(['b']);
    expect(ids({ hasta: '2026-06-01' })).toEqual(['a']);
    expect(ids({ desde: '2026-06-01', hasta: '2026-06-03' })).toEqual(['a', 'b']);
  });

  it('por jugador sin acentos ni mayúsculas, y por estado', () => {
    expect(ids({ jugador: 'PEREZ' })).toEqual(['b']);
    expect(ids({ estado: 'PENDING' })).toEqual(['a']);
  });
});

describe('kpis', () => {
  it('lo cancelado cuenta como pedido pero no como dinero', () => {
    const resultado = kpis([
      pedido({ precio: 20, pago: 'PAID', raquetas: 1 }),
      pedido({ precio: 30, pago: 'PENDING_PAYMENT', raquetas: 2 }),
      pedido({ precio: 50, pago: 'CANCELED', estado: 'CANCELED', raquetas: 1 }),
    ]);

    expect(resultado).toEqual({
      pedidos: 3,
      jugadores: 1,
      raquetas: 4,
      facturado: 50,
      cobrado: 20,
      pendiente: 30,
      ticketMedio: 25,
    });
  });

  it('sin pedidos todo es 0', () => {
    expect(kpis([]).ticketMedio).toBe(0);
  });
});

describe('series', () => {
  it('por estado, en el orden de la leyenda', () => {
    expect(
      porEstado([
        pedido({ estado: 'PENDING' }),
        pedido({ estado: 'PENDING' }),
        pedido({ estado: 'CANCELED' }),
      ]),
    ).toEqual([2, 0, 0, 0, 1]);
  });

  it('por día rellena los días sin pedidos con 0', () => {
    const { dias, series } = pedidosPorDia([
      pedido({ dia: '2026-06-01', estado: 'PENDING' }),
      pedido({ dia: '2026-06-03', estado: 'PENDING' }),
    ]);

    expect(dias).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
    expect(series[0]).toEqual({ nombre: 'Pendiente', datos: [1, 0, 1] });
  });

  it('ingresos: cobrado frente a pendiente, sin lo cancelado', () => {
    const { series } = ingresosPorDia([
      pedido({ dia: '2026-06-01', precio: 20, pago: 'PAID' }),
      pedido({ dia: '2026-06-01', precio: 30, pago: 'PENDING_PAYMENT' }),
      pedido({ dia: '2026-06-01', precio: 99, pago: 'CANCELED', estado: 'CANCELED' }),
    ]);

    expect(series.map((s) => s.datos)).toEqual([[20], [30]]);
  });

  it('top de encordadores, de más a menos y como mucho 8', () => {
    const lista = [
      ...Array.from({ length: 3 }, () => pedido({ encordador: 'María' })),
      pedido({ encordador: 'Carlos' }),
      ...Array.from({ length: 9 }, (_, i) => pedido({ encordador: `E${i}` })),
    ];

    const top = topPor(lista, 'encordador');

    expect(top[0]).toEqual(['María', 3]);
    expect(top).toHaveLength(8);
  });
});
