import { Component, input, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { ExcelApi } from '../../../core/excel/excel.api';
import { ThemeColors } from '../../../core/theme/theme-colors';
import { TournamentContext } from '../../../core/tournament-context/tournament-context';
import { Role } from '../../../shared/models/roles';
import { Chart } from '../../../shared/ui/chart';
import { InformesApi } from '../data-access/api/informes.api';
import { PedidoInforme } from '../data-access/model/informe.model';
import InformesPage from './informes-page';

/** ApexCharts no pinta en jsdom: la gráfica se sustituye por un hueco con sus opciones. */
@Component({ selector: 'app-chart', template: '' })
class ChartStub {
  readonly options = input<unknown>();
  readonly etiqueta = input<string>();
}

const pedido = (overrides: Partial<PedidoInforme>): PedidoInforme => ({
  id: 'p',
  jugador: 'Juan',
  encordador: 'Carlos',
  pago: 'PAID',
  precio: 20,
  creadoEn: '2026-06-01T10:00:00',
  dia: '2026-06-01',
  estado: 'PENDING',
  raquetas: 1,
  ...overrides,
});

describe('InformesPage', () => {
  const torneo = signal<string | null>('t1');
  const api = {
    pedidos: vi.fn(() =>
      of({
        pedidos: [
          pedido({ id: 'a', precio: 20 }),
          pedido({ id: 'b', jugador: 'Ana', precio: 30, pago: 'PENDING_PAYMENT' }),
        ],
        total: 2,
      }),
    ),
  };
  let fixture: ComponentFixture<InformesPage>;
  const element = () => fixture.nativeElement as HTMLElement;

  const render = async (rol: Role) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: InformesApi, useValue: api },
        { provide: ExcelApi, useValue: {} },
        { provide: TournamentContext, useValue: { selectedId: torneo } },
        { provide: AuthStore, useValue: { hasRole: (...roles: Role[]) => roles.includes(rol) } },
        {
          provide: ThemeColors,
          useValue: {
            colores: signal({
              primary: '#111',
              info: '#222',
              success: '#333',
              warning: '#444',
              error: '#555',
              neutral: '#666',
              'base-content': '#777',
              'base-300': '#888',
            }),
            oscuro: signal(false),
          },
        },
      ],
    });
    TestBed.overrideComponent(InformesPage, {
      remove: { imports: [Chart] },
      add: { imports: [ChartStub] },
    });
    fixture = TestBed.createComponent(InformesPage);
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    torneo.set('t1');
  });

  it('calcula los KPIs con los pedidos del torneo', async () => {
    await render('OWNER');

    expect(api.pedidos).toHaveBeenCalledWith('t1');
    const texto = element().textContent!;
    expect(texto).toMatch(/Facturado\s*€?50[.,]00/);
    expect(texto).toMatch(/Jugadores\s*2/);
    expect(element().querySelectorAll('app-chart')).toHaveLength(5);
  });

  it('el OWNER sin torneo tiene que elegirlo; el ADMIN puede ver todos', async () => {
    torneo.set(null);
    await render('OWNER');
    expect(element().textContent).toContain('Selecciona un torneo');
    expect(api.pedidos).not.toHaveBeenCalled();

    TestBed.resetTestingModule();
    await render('ADMIN');
    expect(api.pedidos).toHaveBeenCalledWith(null);
  });

  it('filtrar por jugador recalcula los KPIs', async () => {
    await render('OWNER');
    const input = element().querySelector<HTMLInputElement>('input[type=search]')!;
    input.value = 'ana';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(element().textContent).toMatch(/Pedidos\s*1/);
    expect(element().textContent).toContain('Quitar filtros');
  });

  it('el SUPERVISOR solo exporta (Excel simple), sin importar', async () => {
    await render('SUPERVISOR');

    expect(element().textContent).toContain('Exportar Excel');
    expect(element().querySelector('input[type=file]')).toBeNull();
  });

  /** Lo que la gráfica haría al pulsar la barra `indice`. */
  const pulsarBarra = async (etiqueta: string, indice: number) => {
    const grafica = fixture.debugElement
      .queryAll(By.directive(ChartStub))
      .find((d) => d.componentInstance.etiqueta()?.includes(etiqueta))!;
    const opciones = grafica.componentInstance.options() as {
      chart: { events: { dataPointSelection: (e: unknown, c: unknown, o: unknown) => void } };
    };
    opciones.chart.events.dataPointSelection(null, null, { dataPointIndex: indice });
    await fixture.whenStable();
  };

  it('pulsar un jugador en su gráfica filtra el informe por él', async () => {
    await render('OWNER');

    await pulsarBarra('jugadores', 0);

    expect(element().querySelector<HTMLInputElement>('input[type=search]')!.value).toBeTruthy();
    expect(element().textContent).toMatch(/Pedidos\s*1/);
  });

  it('pulsar un encordador filtra por él, con una etiqueta para quitarlo', async () => {
    await render('OWNER');

    await pulsarBarra('encordadores', 0);

    const quitar = element().querySelector<HTMLButtonElement>(
      '[aria-label="Quitar el filtro de encordador Carlos"]',
    )!;
    expect(quitar).not.toBeNull();
    quitar.click();
    await fixture.whenStable();
    expect(element().querySelector('[aria-label^="Quitar el filtro de encordador"]')).toBeNull();
  });
});
