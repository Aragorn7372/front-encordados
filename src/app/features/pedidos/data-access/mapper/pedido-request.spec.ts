import { toPedido } from './pedido.mapper';
import {
  PedidoFormValue,
  fechaPorDefecto,
  nuevaLinea,
  pedidoVacio,
  precioSugerido,
} from '../model/pedido-form.model';
import { toFormValue, toPurchasedRequest } from './pedido-request';
import { PurchasedDto } from '../dto/pedido.dto';

const encordado = (overrides: Partial<PedidoFormValue> = {}): PedidoFormValue => ({
  ...pedidoVacio(),
  jugador: 'ana',
  encordador: 'carlos',
  maquina: ' M-1 ',
  fecha: '2026-06-02T10:00',
  lineas: [
    { ...nuevaLinea(), raqueta: 'Pure Aero', cuerdaV: 'RPM', tensionV: 25, cuerdaH: 'Xcel' },
  ],
  ...overrides,
});

describe('toPurchasedRequest', () => {
  it('traduce un encordado al contrato del backend', () => {
    const request = toPurchasedRequest(encordado(), 't1');

    expect(request).toMatchObject({
      tournamentId: 't1',
      playerName: 'ana',
      assignedToName: 'carlos',
      machine: 'M-1',
      payStatus: 'PENDING_PAYMENT',
    });
    expect(request.lineas[0]).toMatchObject({
      raquetModel: 'Pure Aero',
      stringSetup: { stringV: 'RPM', tensionV: 25, stringH: 'Xcel' },
    });
  });

  it('envía la fecha en ISO a partir de la hora local', () => {
    const request = toPurchasedRequest(encordado(), 't1');
    expect(request.lineas[0].dateString).toBe(new Date('2026-06-02T10:00').toISOString());
  });

  it('marca el material propio en los comentarios', () => {
    const request = toPurchasedRequest(
      encordado({ materialPropio: true, comentarios: 'Suave' }),
      't1',
    );
    expect(request.comments).toBe('[MATERIAL PROPIO] Suave');
  });

  it('codifica un pedido de taller como lo espera el backend', () => {
    const request = toPurchasedRequest(
      encordado({
        tipo: 'taller',
        cuando: 'Mañana',
        articulos: [{ articulo: 'Overgrip', cantidad: 3, precio: 2, notas: 'negro' }],
      }),
      't1',
    );

    expect(request.lineas[0]).toMatchObject({
      raquetModel: 'Overgrip',
      color: 'Cant: 3 | negro',
      stringSetup: { stringV: 'Mañana', stringH: 'ORDEN_DE_TALLER' },
    });
    expect(request.lineas[0].stringSetup.tensionV).toBeGreaterThanOrEqual(5);
  });

  it('un taller nunca lleva la marca de material propio', () => {
    const request = toPurchasedRequest(encordado({ tipo: 'taller', materialPropio: true }), 't1');
    expect(request.comments).toBe('');
  });

  it('N unidades de una raqueta son N líneas', () => {
    const value = encordado();
    value.lineas = [
      { ...value.lineas[0], cantidad: 5 },
      { ...nuevaLinea(), raqueta: 'Blade 98' },
    ];

    const lineas = toPurchasedRequest(value, 't1').lineas;

    expect(lineas.map((l) => l.raquetModel)).toEqual([
      'Pure Aero',
      'Pure Aero',
      'Pure Aero',
      'Pure Aero',
      'Pure Aero',
      'Blade 98',
    ]);
  });

  it('una raqueta con fecha propia la envía; las demás, la del pedido', () => {
    const value = encordado();
    value.lineas = [value.lineas[0], { ...nuevaLinea(), fecha: '2026-06-05T18:00' }];

    const [primera, segunda] = toPurchasedRequest(value, 't1').lineas;

    expect(primera.dateString).toBe(new Date('2026-06-02T10:00').toISOString());
    expect(segunda.dateString).toBe(new Date('2026-06-05T18:00').toISOString());
  });

  it('sin logo no se envía color aunque se hubiera escrito', () => {
    const value = encordado();
    value.lineas = [
      { ...value.lineas[0], logo: false, color: 'Rojo' },
      { ...value.lineas[0], logo: true, color: ' Azul ' },
    ];

    const lineas = toPurchasedRequest(value, 't1').lineas;

    expect(lineas.map((l) => [l.logotype, l.color])).toEqual([
      [false, ''],
      [true, 'Azul'],
    ]);
  });

  it('ida y vuelta: lo que se envía se vuelve a leer igual', () => {
    const value = encordado({
      tipo: 'taller',
      cuando: 'Mañana',
      articulos: [{ articulo: 'Overgrip', cantidad: 3, precio: 2, notas: 'negro' }],
    });
    const request = toPurchasedRequest(value, 't1');
    const dto = {
      id: 'p1',
      tournamentId: 't1',
      player: { username: 'ana', name: 'Ana', imageUrl: '', bonos: 0 },
      encorder: { username: 'carlos', name: 'Carlos', imageUrl: '', bonos: 0 },
      machine: request.machine,
      comments: request.comments,
      payStatus: request.payStatus,
      createdAt: '',
      updatedAt: '',
      price: request.price,
      lineas: request.lineas.map((linea, i) => ({ ...linea, id: `l${i}`, status: 'PENDING' })),
    } as PurchasedDto;

    expect(toPedido(dto).lineas[0]).toMatchObject({
      tipo: 'taller',
      articulo: 'Overgrip',
      cantidad: 3,
      notas: 'negro',
      cuando: 'Mañana',
    });
  });
});

describe('toFormValue (repetir)', () => {
  it('conserva jugador, encordador y cordaje, con fecha nueva', () => {
    const pedido = toPedido({
      id: 'p1',
      tournamentId: 't1',
      player: { username: 'ana', name: 'Ana', imageUrl: '', bonos: 0 },
      encorder: { username: 'carlos', name: 'Carlos', imageUrl: '', bonos: 0 },
      machine: 'M-1',
      comments: '[MATERIAL PROPIO] Suave',
      payStatus: 'PAID',
      createdAt: '',
      updatedAt: '',
      price: 10,
      lineas: [
        {
          id: 'l1',
          raquetModel: 'Pure Aero',
          nudos: 2,
          dateString: '2020-01-01T10:00:00Z',
          logotype: true,
          color: 'Azul',
          status: 'DELIVERED_TOpLAYER',
          stringSetup: {
            stringV: 'RPM',
            tensionV: 25,
            preStetchV: 5,
            stringH: 'Xcel',
            tensionH: 24,
            preStetchH: 0,
          },
        },
      ],
    });

    const value = toFormValue(pedido);

    expect(value).toMatchObject({
      jugador: 'ana',
      encordador: 'carlos',
      maquina: 'M-1',
      materialPropio: true,
      comentarios: 'Suave',
      pago: 'PENDING_PAYMENT',
    });
    expect(value.lineas[0]).toMatchObject({ raqueta: 'Pure Aero', cuerdaV: 'RPM', tensionV: 25 });
    expect(value.fecha).toBe(fechaPorDefecto());
  });

  it('las raquetas iguales vuelven a ser una con su cantidad', () => {
    const value = encordado();
    value.lineas = [
      { ...value.lineas[0], cantidad: 3, fecha: '2026-06-09T10:00' },
      { ...nuevaLinea(), raqueta: 'Blade 98', cuerdaV: 'RPM' },
    ];
    const request = toPurchasedRequest(value, 't1');
    const pedido = toPedido({
      id: 'p1',
      tournamentId: 't1',
      player: { username: 'ana', name: 'Ana', imageUrl: '', bonos: 0 },
      encorder: { username: 'carlos', name: 'Carlos', imageUrl: '', bonos: 0 },
      machine: '',
      comments: '',
      payStatus: 'PAID',
      createdAt: '',
      updatedAt: '',
      price: 0,
      lineas: request.lineas.map((linea, i) => ({ ...linea, id: `l${i}`, status: 'PENDING' })),
    });

    const repetido = toFormValue(pedido).lineas;

    expect(repetido.map((l) => [l.raqueta, l.cantidad, l.fecha])).toEqual([
      ['Pure Aero', 3, ''],
      ['Blade 98', 1, ''],
    ]);
  });

  it('sin logo, al repetir no arrastra el color', () => {
    const pedido = toPedido({
      id: 'p1',
      tournamentId: 't1',
      player: { username: 'ana', name: 'Ana', imageUrl: '', bonos: 0 },
      encorder: { username: 'carlos', name: 'Carlos', imageUrl: '', bonos: 0 },
      machine: '',
      comments: '',
      payStatus: 'PAID',
      createdAt: '',
      updatedAt: '',
      price: 0,
      lineas: [
        {
          id: 'l1',
          raquetModel: 'Pure Aero',
          nudos: 2,
          dateString: '',
          logotype: false,
          color: 'Rojo',
          status: 'PENDING',
          stringSetup: {
            stringV: 'RPM',
            tensionV: 25,
            preStetchV: 0,
            stringH: '',
            tensionH: 25,
            preStetchH: 0,
          },
        },
      ],
    });

    expect(toFormValue(pedido).lineas[0].color).toBe('');
  });
});

describe('precioSugerido', () => {
  it('18 € por raqueta y 10 € si trae el material', () => {
    const dos = encordado({ lineas: [nuevaLinea(), nuevaLinea()] });
    expect(precioSugerido(dos)).toBe(36);
    expect(precioSugerido({ ...dos, materialPropio: true })).toBe(20);
  });

  it('cuenta las unidades de cada raqueta', () => {
    const cinco = encordado({ lineas: [{ ...nuevaLinea(), cantidad: 5 }] });
    expect(precioSugerido(cinco)).toBe(90);
  });

  it('en taller suma precio por cantidad', () => {
    expect(
      precioSugerido(
        encordado({
          tipo: 'taller',
          articulos: [
            { articulo: 'A', cantidad: 3, precio: 2, notas: '' },
            { articulo: 'B', cantidad: 1, precio: 5, notas: '' },
          ],
        }),
      ),
    ).toBe(11);
  });
});

describe('fechaPorDefecto', () => {
  it('es mañana a la hora en punto', () => {
    expect(fechaPorDefecto(new Date(2026, 5, 1, 9, 37))).toBe('2026-06-02T09:00');
  });
});
