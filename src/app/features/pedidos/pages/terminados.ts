import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ExcelActions } from '../../../core/excel/excel-actions';
import { TournamentContext } from '../../../core/tournament-context/tournament-context';
import { LINE_STATUS, PAYMENT_STATUS, PaymentStatus } from '../../../shared/models/status';
import { EmptyState } from '../../../shared/ui/empty-state';
import { Modal } from '../../../shared/ui/modal';
import { PageHeader } from '../../../shared/ui/page-header';
import { SearchInput } from '../../../shared/ui/search-input';
import { StatCard } from '../../../shared/ui/stat-card';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { coincideBusqueda } from '../data-access/mapper/pedido.mapper';
import { Pedido } from '../data-access/model/pedido.model';
import { PedidosStore } from '../data-access/store/pedidos.store';
import { LineaActualizada, PedidoDetalle } from '../ui/pedido-detalle';
import { Avatar } from '../../../shared/ui/avatar';

type Resultado = 'listo' | 'entregado' | 'cancelado';

const RESULTADOS: { value: Resultado; label: string }[] = [
  { value: 'listo', label: 'Listo para entregar' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];

function resultado(pedido: Pedido): Resultado | null {
  if (pedido.estado === 'COMPLETED') return 'listo';
  if (pedido.estado === 'DELIVERED_TOpLAYER') return 'entregado';
  if (pedido.estado === 'CANCELED') return 'cancelado';
  return null;
}

/** Histórico: lo ya terminado. Comparte store con el tablero, así que también se actualiza en vivo. */

@Component({
  selector: 'app-terminados',
  imports: [
    Avatar,
    CurrencyPipe,
    DatePipe,
    EmptyState,
    Modal,
    PageHeader,
    PedidoDetalle,
    ExcelActions,
    SearchInput,
    StatCard,
    StatusBadge,
  ],
  providers: [PedidosStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header heading="Terminados" subtitle="Pedidos listos, entregados o cancelados">
      <app-excel-actions
        [tournamentId]="torneo()"
        [tipos]="['pedidos']"
        [conImportar]="false"
        nombre="pedidos.xlsx"
      />
    </app-page-header>

    @if (store.needsTournament()) {
      <app-empty-state
        heading="Selecciona un torneo"
        message="Elige un torneo en la barra superior para ver su histórico."
      />
    } @else {
      <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <app-stat-card label="Pedidos" [value]="kpis().pedidos" />
        <app-stat-card
          label="Importe"
          [value]="(kpis().importe | currency: 'EUR') ?? ''"
          hint="Sin contar cancelados"
        />
        <app-stat-card
          label="Cobrado"
          tone="success"
          [value]="(kpis().cobrado | currency: 'EUR') ?? ''"
        />
        <app-stat-card
          label="Pendiente de cobro"
          tone="warning"
          [value]="(kpis().pendiente | currency: 'EUR') ?? ''"
        />
      </div>

      <div class="mb-4 flex flex-wrap items-center gap-2">
        <div class="w-full max-w-sm">
          <app-search-input
            placeholder="Buscar pedido…"
            [value]="q() ?? ''"
            (searched)="setFilter('q', $event)"
          />
        </div>
        <select
          class="select w-auto"
          aria-label="Filtrar por estado"
          (change)="onFiltro('estado', $event)"
        >
          <option value="" [selected]="!estado()">Todos los estados</option>
          @for (opcion of resultados; track opcion.value) {
            <option [value]="opcion.value" [selected]="opcion.value === estado()">
              {{ opcion.label }}
            </option>
          }
        </select>
        <select
          class="select w-auto"
          aria-label="Filtrar por pago"
          (change)="onFiltro('pago', $event)"
        >
          <option value="" [selected]="!pago()">Todos los pagos</option>
          @for (opcion of pagos; track opcion.value) {
            <option [value]="opcion.value" [selected]="opcion.value === pago()">
              {{ opcion.label }}
            </option>
          }
        </select>
      </div>

      @if (store.failed()) {
        <app-empty-state
          heading="No se han podido cargar los pedidos"
          message="Inténtalo de nuevo en unos segundos."
        />
      } @else if (filas().length === 0 && !store.loading()) {
        <app-empty-state
          heading="No hay pedidos terminados"
          message="Ajusta los filtros o el torneo."
        />
      } @else {
        <div class="bg-base-200 rounded-box overflow-x-auto" [attr.aria-busy]="store.loading()">
          <table class="table">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Encordador</th>
                <th>Estado</th>
                <th>Pago</th>
                <th class="text-right">Importe</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              @for (pedido of filas(); track pedido.id) {
                <tr>
                  <td>
                    <span class="inline-flex items-center gap-2">
                      <app-avatar
                        size="xs"
                        [url]="pedido.jugador.imageUrl"
                        [nombre]="pedido.jugador.name || pedido.jugador.username"
                      />
                      <button
                        type="button"
                        class="link link-hover text-left"
                        (click)="abiertoId.set(pedido.id)"
                      >
                        {{ pedido.jugador.name || pedido.jugador.username }}
                      </button>
                    </span>
                    @if (pedido.tipo === 'taller') {
                      <span class="badge badge-outline badge-sm ml-1">Taller</span>
                    }
                  </td>
                  <td>
                    <span class="inline-flex items-center gap-2">
                      <app-avatar
                        size="xs"
                        [url]="pedido.encordador.imageUrl"
                        [nombre]="pedido.encordador.name || pedido.encordador.username"
                      />
                      {{ pedido.encordador.name || pedido.encordador.username }}
                    </span>
                  </td>
                  <td><app-status-badge [status]="estadoInfo[pedido.estado]" /></td>
                  <td><app-status-badge [status]="pagoInfo(pedido)" /></td>
                  <td class="text-right">{{ pedido.precio | currency: 'EUR' }}</td>
                  <td class="whitespace-nowrap">{{ pedido.actualizadoEn | date: 'short' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    <app-modal
      [heading]="detalleTitulo()"
      [open]="abiertoId() !== null"
      [wide]="true"
      (closed)="abiertoId.set(null)"
    >
      @if (detalle(); as pedido) {
        <app-pedido-detalle
          [pedido]="pedido"
          [canManage]="true"
          [canCancel]="true"
          [canRepeat]="true"
          (changed)="store.applyChange($event)"
          (lineChanged)="onLinea($event)"
          (repeat)="repetir($event)"
        />
      }
    </app-modal>
  `,
})
export default class Terminados {
  protected readonly store = inject(PedidosStore);
  private readonly context = inject(TournamentContext);
  private readonly router = inject(Router);

  /** Desde la query string. */
  readonly q = input<string>();
  readonly pago = input<PaymentStatus>();
  readonly estado = input<Resultado>();

  protected readonly torneo = this.context.selectedId;
  protected readonly abiertoId = signal<string | null>(null);
  protected readonly resultados = RESULTADOS;
  protected readonly estadoInfo = LINE_STATUS;
  protected readonly pagos = Object.entries(PAYMENT_STATUS).map(([value, info]) => ({
    value,
    label: info.label,
  }));

  private readonly terminados = computed(() =>
    this.store.pedidos().filter((pedido) => resultado(pedido) !== null),
  );

  protected readonly filas = computed(() => {
    const busqueda = this.q() ?? '';
    const pago = this.pago();
    const estado = this.estado();
    return this.terminados()
      .filter((pedido) => coincideBusqueda(pedido, busqueda))
      .filter((pedido) => !pago || pedido.pago === pago)
      .filter((pedido) => !estado || resultado(pedido) === estado)
      .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
  });

  /** Sobre lo filtrado: así los KPIs responden a los filtros. */
  protected readonly kpis = computed(() => {
    const filas = this.filas();
    const validos = filas.filter((pedido) => pedido.estado !== 'CANCELED');
    const suma = (lista: Pedido[]) => lista.reduce((total, pedido) => total + pedido.precio, 0);
    return {
      pedidos: filas.length,
      importe: suma(validos),
      cobrado: suma(validos.filter((pedido) => pedido.pago === 'PAID')),
      pendiente: suma(validos.filter((pedido) => pedido.pago === 'PENDING_PAYMENT')),
    };
  });

  protected readonly detalle = computed(
    () => this.store.pedidos().find((pedido) => pedido.id === this.abiertoId()) ?? null,
  );

  protected readonly detalleTitulo = computed(() => {
    const pedido = this.detalle();
    return pedido ? `Pedido de ${pedido.jugador.name || pedido.jugador.username}` : 'Pedido';
  });

  protected pagoInfo(pedido: Pedido) {
    return PAYMENT_STATUS[pedido.pago] ?? { label: pedido.pago, tone: 'neutral' as const };
  }

  protected onLinea({ pedidoId, linea }: LineaActualizada): void {
    this.store.applyLine(pedidoId, linea);
  }

  /** Repetir se hace desde el tablero, que tiene el formulario de crear. */
  protected repetir(pedido: Pedido): void {
    void this.router.navigate(['/pedidos'], { queryParams: { openPedido: pedido.id } });
  }

  protected onFiltro(key: 'pago' | 'estado', event: Event): void {
    this.setFilter(key, (event.target as HTMLSelectElement).value);
  }

  protected setFilter(key: 'q' | 'pago' | 'estado', value: string): void {
    void this.router.navigate([], {
      queryParams: { [key]: value || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
