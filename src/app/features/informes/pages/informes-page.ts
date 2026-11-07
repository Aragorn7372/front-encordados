import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { ApexOptions } from 'apexcharts';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { ExcelActions } from '../../../core/excel/excel-actions';
import { ExcelTipo } from '../../../core/excel/excel.model';
import { ColorTema, ThemeColors } from '../../../core/theme/theme-colors';
import { LINE_STATUS, LineStatus } from '../../../shared/models/status';
import { Chart } from '../../../shared/ui/chart';
import { SinDatos } from '../../../core/offline/sin-datos';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { INFORME_MAX } from '../data-access/api/informes.api';
import { ESTADOS_INFORME, FiltrosInforme } from '../data-access/model/informe.model';
import { InformesStore } from '../data-access/store/informes.store';

/** Los mismos colores que los badges de estado, para que se reconozcan de un vistazo. */
const COLOR_ESTADO: Record<LineStatus, ColorTema> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  DELIVERED_TOpLAYER: 'neutral',
  CANCELED: 'error',
};

/** Todo lo que el Excel del torneo puede llevar, para OWNER y ADMIN. */
const TIPOS_EXCEL: ExcelTipo[] = ['tournament', 'pedidos', 'users', 'cuerdas', 'materials'];

const corto = (dia: string) => {
  const [, mes, d] = dia.split('-');
  return `${d}/${mes}`;
};

@Component({
  selector: 'app-informes-page',
  imports: [SinDatos, Chart, CurrencyPipe, EmptyState, ExcelActions, PageHeader, StatCard],
  providers: [InformesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header heading="Informes" subtitle="Pedidos, ingresos y encordadores del torneo">
      <!-- El SUPERVISOR solo tiene la exportación simple; OWNER y ADMIN, la avanzada e importar -->
      <app-excel-actions
        [tournamentId]="store.tournamentId()"
        [tipos]="tiposExcel"
        [simple]="esSupervisor()"
        [conImportar]="!esSupervisor()"
        nombre="informe.xlsx"
        (importado)="store.reload()"
      />
    </app-page-header>

    @if (store.needsTournament()) {
      <app-empty-state
        heading="Selecciona un torneo"
        message="Elige un torneo en la barra superior para ver su informe."
      />
    } @else if (store.failed()) {
      <app-sin-datos que="datos del informe" />
    } @else {
      <form
        class="mb-4 flex flex-wrap items-end gap-2"
        aria-label="Filtros"
        (submit)="$event.preventDefault()"
      >
        <label class="fieldset py-0">
          <span class="fieldset-legend">Desde</span>
          <input
            type="date"
            class="input w-auto"
            [value]="store.filtros().desde"
            (change)="filtro('desde', $event)"
          />
        </label>
        <label class="fieldset py-0">
          <span class="fieldset-legend">Hasta</span>
          <input
            type="date"
            class="input w-auto"
            [value]="store.filtros().hasta"
            (change)="filtro('hasta', $event)"
          />
        </label>
        <label class="fieldset py-0">
          <span class="fieldset-legend">Jugador</span>
          <input
            type="search"
            class="input w-48"
            placeholder="Nombre…"
            [value]="store.filtros().jugador"
            (input)="filtro('jugador', $event)"
          />
        </label>
        <label class="fieldset py-0">
          <span class="fieldset-legend">Estado</span>
          <select class="select w-auto" (change)="filtro('estado', $event)">
            <option value="" [selected]="!store.filtros().estado">Todos</option>
            @for (estado of estados; track estado) {
              <option [value]="estado" [selected]="store.filtros().estado === estado">
                {{ estadoLabel[estado].label }}
              </option>
            }
          </select>
        </label>
        @if (store.filtros().encordador; as encordador) {
          <button
            type="button"
            class="btn btn-sm self-center"
            [attr.aria-label]="'Quitar el filtro de encordador ' + encordador"
            (click)="store.setFiltro('encordador', '')"
          >
            Encordador: {{ encordador }} ✕
          </button>
        }
        @if (store.hayFiltros()) {
          <button type="button" class="btn btn-ghost" (click)="store.limpiar()">
            Quitar filtros
          </button>
        }
      </form>

      @if (store.total() > limite) {
        <div role="status" class="alert alert-warning alert-soft mb-4">
          El informe usa los {{ limite }} pedidos más recientes de {{ store.total() }}.
        </div>
      }

      <div class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <app-stat-card label="Pedidos" [value]="'' + store.kpis().pedidos" />
        <app-stat-card label="Jugadores" [value]="'' + store.kpis().jugadores" />
        <app-stat-card label="Raquetas" [value]="'' + store.kpis().raquetas" />
        <app-stat-card
          label="Facturado"
          [value]="(store.kpis().facturado | currency: 'EUR') ?? ''"
        />
        <app-stat-card label="Cobrado" [value]="(store.kpis().cobrado | currency: 'EUR') ?? ''" />
        <app-stat-card
          label="Por cobrar"
          [value]="(store.kpis().pendiente | currency: 'EUR') ?? ''"
        />
        <app-stat-card
          label="Ticket medio"
          [value]="(store.kpis().ticketMedio | currency: 'EUR') ?? ''"
        />
      </div>

      @if (store.pedidos().length === 0 && !store.loading()) {
        <app-empty-state
          heading="No hay pedidos que mostrar"
          [message]="
            store.hayFiltros()
              ? 'Prueba a quitar algún filtro.'
              : 'Este torneo aún no tiene pedidos.'
          "
        />
      } @else {
        <div class="grid gap-4 lg:grid-cols-2" [attr.aria-busy]="store.loading()">
          <section class="card bg-base-100 border-base-300 border">
            <div class="card-body">
              <h2 class="card-title text-base">Pedidos por estado</h2>
              <app-chart [options]="estadoOptions()" etiqueta="Gráfica de pedidos por estado" />
            </div>
          </section>
          <section class="card bg-base-100 border-base-300 border">
            <div class="card-body">
              <h2 class="card-title text-base">Pedidos por día</h2>
              <app-chart [options]="diaOptions()" etiqueta="Gráfica de pedidos por día y estado" />
            </div>
          </section>
          <section class="card bg-base-100 border-base-300 border lg:col-span-2">
            <div class="card-body">
              <h2 class="card-title text-base">Ingresos por día</h2>
              <app-chart
                [options]="ingresosOptions()"
                etiqueta="Gráfica de ingresos cobrados y pendientes por día"
              />
            </div>
          </section>
          <section class="card bg-base-100 border-base-300 border">
            <div class="card-body">
              <h2 class="card-title text-base">Encordadores con más pedidos</h2>
              <p class="text-xs opacity-60">Pulsa una barra para ver solo sus pedidos.</p>
              <app-chart
                [options]="topEncordadoresOptions()"
                etiqueta="Gráfica de los encordadores con más pedidos"
              />
            </div>
          </section>
          <section class="card bg-base-100 border-base-300 border">
            <div class="card-body">
              <h2 class="card-title text-base">Jugadores con más pedidos</h2>
              <p class="text-xs opacity-60">Pulsa una barra para ver solo sus pedidos.</p>
              <app-chart
                [options]="topJugadoresOptions()"
                etiqueta="Gráfica de los jugadores con más pedidos"
              />
            </div>
          </section>
        </div>
      }
    }
  `,
})
export default class InformesPage {
  protected readonly store = inject(InformesStore);
  private readonly auth = inject(AuthStore);
  private readonly tema = inject(ThemeColors);

  protected readonly estados = ESTADOS_INFORME;
  protected readonly estadoLabel = LINE_STATUS;
  protected readonly limite = INFORME_MAX;
  protected readonly tiposExcel = TIPOS_EXCEL;
  protected readonly esSupervisor = computed(() => this.auth.hasRole('SUPERVISOR'));

  /** Lo común a todas: transparente, sin barra de herramientas y con el texto del tema. */
  private readonly base = computed<ApexOptions>(() => {
    const c = this.tema.colores();
    return {
      chart: {
        height: 280,
        background: 'transparent',
        foreColor: c['base-content'],
        toolbar: { show: false },
        fontFamily: 'inherit',
        animations: { enabled: false },
      },
      theme: { mode: this.tema.oscuro() ? 'dark' : 'light' },
      grid: { borderColor: c['base-300'] },
      legend: { position: 'bottom' },
      dataLabels: { enabled: false },
      tooltip: { theme: this.tema.oscuro() ? 'dark' : 'light' },
    };
  });

  private readonly coloresEstado = computed(() =>
    ESTADOS_INFORME.map((estado) => this.tema.colores()[COLOR_ESTADO[estado]]),
  );

  protected readonly estadoOptions = computed<ApexOptions>(() => ({
    ...this.base(),
    chart: { ...this.base().chart, type: 'donut' },
    series: this.store.porEstado(),
    labels: ESTADOS_INFORME.map((estado) => LINE_STATUS[estado].label),
    colors: this.coloresEstado(),
    stroke: { colors: [this.tema.colores()['base-300']] },
  }));

  protected readonly diaOptions = computed<ApexOptions>(() => {
    const { dias, series } = this.store.porDia();
    return {
      ...this.base(),
      chart: { ...this.base().chart, type: 'bar', stacked: true },
      series: series.map((serie) => ({ name: serie.nombre, data: serie.datos })),
      colors: this.coloresEstado(),
      xaxis: { categories: dias.map(corto) },
      yaxis: { labels: { formatter: (v: number) => String(Math.round(v)) } },
    };
  });

  protected readonly ingresosOptions = computed<ApexOptions>(() => {
    const { dias, series } = this.store.ingresos();
    const c = this.tema.colores();
    return {
      ...this.base(),
      chart: { ...this.base().chart, type: 'area', stacked: true },
      series: series.map((serie) => ({ name: serie.nombre, data: serie.datos })),
      colors: [c.success, c.warning],
      stroke: { curve: 'smooth', width: 2 },
      xaxis: { categories: dias.map(corto) },
      yaxis: { labels: { formatter: (v: number) => `${Math.round(v)} €` } },
    };
  });

  protected readonly topEncordadoresOptions = computed(() =>
    this.ranking(this.store.topEncordadores(), this.tema.colores().info, (nombre) =>
      this.store.setFiltro('encordador', nombre),
    ),
  );

  protected readonly topJugadoresOptions = computed(() =>
    this.ranking(this.store.topJugadores(), this.tema.colores().success, (nombre) =>
      this.store.setFiltro('jugador', nombre),
    ),
  );

  /**
   * Barras horizontales de un top. Pulsar una barra filtra el informe por esa persona: así la
   * gráfica sirve para encontrar a alguien, no solo para mirarla.
   */
  private ranking(
    top: [string, number][],
    color: string,
    alPulsar: (nombre: string) => void,
  ): ApexOptions {
    return {
      ...this.base(),
      chart: {
        ...this.base().chart,
        type: 'bar',
        events: {
          dataPointSelection: (_evento, _grafica, opciones) => {
            const nombre = top[opciones?.dataPointIndex ?? -1]?.[0];
            if (nombre) alPulsar(nombre);
          },
        },
      },
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      series: [{ name: 'Pedidos', data: top.map(([, cuantos]) => cuantos) }],
      colors: [color],
      xaxis: { categories: top.map(([nombre]) => nombre) },
      legend: { show: false },
    };
  }

  protected filtro(clave: keyof FiltrosInforme, event: Event): void {
    const valor = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.store.setFiltro(clave, valor as never);
  }
}
