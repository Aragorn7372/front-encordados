import { signal } from '@angular/core';
import { provideEscriturasDirectas } from '../data-access/store/pedidos-escrituras.testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpanishLocale } from '../../../core/config/i18n/provide-locale';
import { TournamentContext } from '../../../core/tournament-context/tournament-context';
import { Pedido } from '../data-access/model/pedido.model';
import { PedidosApi } from '../data-access/api/pedidos.api';
import { PedidosStore } from '../data-access/store/pedidos.store';
import Terminados from './terminados';

const usuario = (username: string) => ({ username, name: username, imageUrl: '', bonos: 0 });
const pedido = (
  id: string,
  estado: string,
  pago = 'PAID',
  precio = 10,
  actualizadoEn = '2026-06-01',
) =>
  ({
    id,
    jugador: usuario(`jugador-${id}`),
    encordador: usuario('carlos'),
    maquina: '',
    comentarios: '',
    tipo: 'encordado',
    estado,
    columna: 'listo',
    pago,
    precio,
    actualizadoEn,
    lineas: [],
  }) as unknown as Pedido;

describe('Terminados', () => {
  const store = {
    pedidos: signal<Pedido[]>([]),
    needsTournament: signal(false),
    failed: signal(false),
    loading: signal(false),
    applyChange: vi.fn(),
    applyLine: vi.fn(),
  };
  const torneo = signal<string | null>('t1');
  let fixture: ComponentFixture<Terminados>;

  const element = () => fixture.nativeElement as HTMLElement;
  const filas = () => [...element().querySelectorAll('tbody tr')].map((tr) => tr.textContent ?? '');

  const render = async (inputs: Record<string, unknown> = {}) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideSpanishLocale(),
        { provide: TournamentContext, useValue: { selectedId: torneo } },
        { provide: PedidosApi, useValue: {} },
        provideEscriturasDirectas({}),
      ],
    });
    TestBed.overrideComponent(Terminados, {
      set: { providers: [{ provide: PedidosStore, useValue: store }] },
    });
    fixture = TestBed.createComponent(Terminados);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    await fixture.whenStable();
  };

  beforeEach(() => {
    torneo.set('t1');
    store.pedidos.set([
      pedido('activo', 'IN_PROGRESS'),
      pedido('listo', 'COMPLETED', 'PENDING_PAYMENT', 20, '2026-06-03'),
      pedido('entregado', 'DELIVERED_TOpLAYER', 'PAID', 30, '2026-06-02'),
      pedido('cancelado', 'CANCELED', 'CANCELED', 99, '2026-06-01'),
    ]);
  });

  it('solo muestra lo terminado, lo más reciente primero', async () => {
    await render();

    const texto = filas();
    expect(texto).toHaveLength(3);
    expect(texto[0]).toContain('jugador-listo');
    expect(texto.join()).not.toContain('jugador-activo');
  });

  it('los KPIs no cuentan el importe de lo cancelado', async () => {
    await render();

    const kpis = element().querySelector('.grid')!.textContent!.replace(/\s/g, '');
    expect(kpis).toContain('Pedidos3');
    expect(kpis).toMatch(/Importe50,00/);
    expect(kpis).toMatch(/Cobrado30,00/);
    expect(kpis).toMatch(/Pendientedecobro20,00/);
  });

  it('filtra por estado desde la URL', async () => {
    await render({ estado: 'cancelado' });
    expect(filas()).toHaveLength(1);
    expect(filas()[0]).toContain('jugador-cancelado');
  });

  it('sin torneo no se puede exportar', async () => {
    torneo.set(null);
    await render();

    const boton = [...element().querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Exportar'),
    )!;
    expect(boton.disabled).toBe(true);
  });
});
