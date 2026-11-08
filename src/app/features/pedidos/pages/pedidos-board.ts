import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { mediaQuery } from '../../../shared/utils/media';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { OfflineState } from '../../../core/offline/offline-state';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { ToastService } from '../../../core/toast/toast.service';
import { TournamentContext } from '../../../core/tournament-context/tournament-context';
import { PAYMENT_STATUS, PaymentStatus } from '../../../shared/models/status';
import { SinDatos } from '../../../core/offline/sin-datos';
import { EmptyState } from '../../../shared/ui/empty-state';
import { Modal } from '../../../shared/ui/modal';
import { PageHeader } from '../../../shared/ui/page-header';
import { SearchInput } from '../../../shared/ui/search-input';
import { coincideTarjeta, tarjetasDe } from '../data-access/mapper/pedido.mapper';
import { COLUMNAS, Columna, Pedido, Tarjeta } from '../data-access/model/pedido.model';
import { JugadorOpcion, PedidosApi, TABLERO_MAX } from '../data-access/api/pedidos.api';
import { PedidosStore } from '../data-access/store/pedidos.store';
import { PedidoCreado } from '../data-access/store/pedidos-escrituras';
import { esTemporal } from '../../../core/offline/outbox';
import { KanbanColumn, TarjetaMovida } from '../ui/kanban-column';
import { LineaActualizada, PedidoDetalle } from '../ui/pedido-detalle';
import { PedidoForm } from '../ui/pedido-form';
import { CodigosPedido } from '../ui/codigos-pedido';
import { Esqueleto } from '../../../shared/ui/esqueleto';
import { PedidoFormValue } from '../data-access/model/pedido-form.model';
import { toFormValue } from '../data-access/mapper/pedido-request';
import { injectCancelarLinea } from '../ui/cancelar-pedido';
import { Icon } from '../../../shared/ui/icon';

/**
 * Decidido que el jugador puede cancelar, pero el backend aún responde 403 (ENCUERDATU-58).
 * Activar cuando esté arreglado: el resto ya está preparado.
 */
const JUGADOR_PUEDE_CANCELAR = false;

/** Lo más próximo primero; dentro del mismo pedido, en su orden. */
const porFecha = (a: Tarjeta, b: Tarjeta) =>
  (a.linea.fecha || '9999').localeCompare(b.linea.fecha || '9999') || a.numero - b.numero;

/**
 * Tablero común a /pedidos, /mis-asignados y /mis-pedidos. Cada ruta lo configura por `data`;
 * los filtros viven en la URL, así un enlace abre la vista exacta.
 */
@Component({
  selector: 'app-pedidos-board',
  imports: [
    Icon,
    Esqueleto,
    CodigosPedido,
    SinDatos,
    CdkDropListGroup,
    EmptyState,
    KanbanColumn,
    Modal,
    PageHeader,
    PedidoDetalle,
    PedidoForm,
    SearchInput,
  ],
  providers: [PedidosStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [heading]="heading">
      @if (showOffline()) {
        <span class="badge badge-warning" role="status">Reconectando…</span>
      }
      @if (puedeCrear()) {
        <button
          type="button"
          class="btn btn-primary"
          [disabled]="!torneoActivo()"
          [attr.title]="torneoActivo() ? null : 'Elige un torneo en la barra superior'"
          (click)="nuevo(null)"
        >
          Nuevo pedido
        </button>
      }
    </app-page-header>

    @if (store.needsTournament()) {
      <app-empty-state
        heading="Selecciona un torneo"
        message="Elige un torneo en la barra superior para ver sus pedidos."
      />
    } @else {
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <div class="w-full max-w-sm">
          <app-search-input
            placeholder="Buscar pedido…"
            [value]="q() ?? ''"
            (searched)="setFilter('q', $event)"
          />
        </div>

        <select class="select w-auto" aria-label="Filtrar por pago" (change)="onPago($event)">
          <option value="" [selected]="!pago()">Todos los pagos</option>
          @for (opcion of pagos; track opcion.value) {
            <option [value]="opcion.value" [selected]="opcion.value === pago()">
              {{ opcion.label }}
            </option>
          }
        </select>

        @if (encordador(); as nombre) {
          <button type="button" class="btn btn-sm" (click)="setFilter('encordador', '')">
            Encordador: {{ nombre }} <app-icon name="cerrar" />
          </button>
        }
      </div>

      @if (store.total() > limite) {
        <div role="status" class="alert alert-warning alert-soft mb-4">
          Se muestran los {{ limite }} pedidos más recientes de {{ store.total() }}.
        </div>
      }

      @if (store.failed()) {
        <app-sin-datos que="pedidos" />
      } @else {
        <!-- Móvil: pestañas para saltar de columna; la actual sigue al carrusel -->
        <!-- 4 pestañas iguales (nombre arriba, número abajo): así caben siempre, sin su propio scroll -->
        <nav class="mb-3 grid grid-cols-4 gap-1 md:hidden" aria-label="Columnas del tablero">
          @for (columna of columnas; track columna.id; let i = $index) {
            <button
              type="button"
              class="btn h-auto min-h-11 flex-col gap-0 px-1 py-1 leading-tight"
              [class.btn-neutral]="i === columnaVisible()"
              [class.btn-ghost]="i !== columnaVisible()"
              [attr.aria-current]="i === columnaVisible() ? 'true' : null"
              (click)="irAColumna(i)"
            >
              <span class="text-xs font-medium">{{ columna.corto }}</span>
              <span class="text-sm font-bold tabular-nums">{{
                porColumna()[columna.id].length
              }}</span>
            </button>
          }
        </nav>
        <app-esqueleto [cargando]="cargandoTablero()">
          <!-- Móvil: carrusel de columnas. Cada una ocupa el 85 % (se asoma la siguiente) y el
               scroll-snap obligatorio hace que al soltar siempre encaje una: nunca entre dos.
               Desde md, la rejilla de siempre -->
          <div
            #carrusel
            class="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-4"
            cdkDropListGroup
            (scroll)="onCarrusel()"
            (scrollend)="encajar()"
          >
            @for (columna of columnas; track columna.id) {
              <app-kanban-column
                class="w-[85%] shrink-0 snap-start self-start md:w-auto md:self-stretch"
                [arrastrable]="!movil()"
                [columna]="columna.id"
                [label]="columna.label"
                [tarjetas]="porColumna()[columna.id]"
                [readonly]="readonly()"
                [puedeRepetir]="puedeCrear()"
                [sinEnviar]="store.sinEnviar()"
                [cargando]="cargandoTablero()"
                (movida)="onMoved($event)"
                (abierta)="abrir($event.pedido.id)"
                (repetir)="repetir($event.pedido)"
                (cancelar)="cancelarLinea($event)"
                (codigos)="codigosDe.set($event)"
              />
            }
          </div>
        </app-esqueleto>
      }
    }

    <app-modal
      [heading]="formInicial() ? 'Repetir pedido' : 'Nuevo pedido'"
      [open]="creando()"
      [wide]="true"
      (closed)="creando.set(false)"
    >
      <!-- ng-content no es perezoso: el formulario debe nacer al abrir -->
      @if (creando() && torneoFormulario(); as torneo) {
        <app-pedido-form
          [tournamentId]="torneo"
          [inicial]="formInicial()"
          [jugadorExtra]="jugadorRepetido()"
          (created)="onCreado($event)"
          (cancelled)="creando.set(false)"
        />
      }
    </app-modal>

    <app-modal [heading]="codigosTitulo()" [open]="!!codigosDe()" (closed)="codigosDe.set(null)">
      <!-- ng-content no es perezoso: los códigos se generan solo al abrirlo -->
      @if (codigosDe(); as tarjeta) {
        <app-codigos-pedido [pedido]="tarjeta.pedido" />
      }
    </app-modal>

    <app-modal
      [heading]="detalleTitulo()"
      [open]="abiertoId() !== null"
      [wide]="true"
      (closed)="cerrar()"
    >
      @if (detalle(); as pedido) {
        <app-pedido-detalle
          [pedido]="pedido"
          [canManage]="!readonly()"
          [canCancel]="!readonly() || jugadorPuedeCancelar"
          [canRepeat]="puedeCrear()"
          (changed)="store.applyChange($event)"
          (lineChanged)="onLinea($event)"
          (repeat)="repetir($event)"
        />
      } @else if (abiertoId()) {
        <span class="loading loading-spinner" aria-label="Cargando"></span>
      }
    </app-modal>
  `,
})
export default class PedidosBoard {
  protected readonly store = inject(PedidosStore);
  private readonly realtime = inject(RealtimeService);
  private readonly offline = inject(OfflineState);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PedidosApi);
  private readonly auth = inject(AuthStore);
  private readonly context = inject(TournamentContext);
  private readonly toast = inject(ToastService);
  private readonly cancelarLineaPedido = injectCancelarLinea();

  protected readonly puedeCrear = computed(
    () => !this.readonly() && this.auth.hasRole('ADMIN', 'OWNER', 'ENCORDER'),
  );
  /** El pedido se crea en el torneo activo; ADMIN puede ver todo sin elegirlo, pero no crear. */
  protected readonly torneoActivo = computed(() => this.context.selectedId());
  protected readonly creando = signal(false);
  /** Primera carga: aún no hay ninguna tarjeta que enseñar. */
  protected readonly cargandoTablero = computed(
    () => this.store.loading() && Object.values(this.porColumna()).every((l) => l.length === 0),
  );
  protected readonly formInicial = signal<PedidoFormValue | null>(null);
  /** Repetir crea el pedido en el torneo del original, no en el que esté seleccionado. */
  private readonly torneoRepetido = signal<string | null>(null);
  protected readonly jugadorRepetido = signal<JugadorOpcion | null>(null);
  protected readonly torneoFormulario = computed(
    () => this.torneoRepetido() ?? this.torneoActivo(),
  );

  protected readonly abiertoId = linkedSignal(() => this.openPedido() ?? null);

  /** Un pedido que no está en el tablero (otro torneo o más de 200) se pide aparte. */
  private readonly fuera = rxResource({
    params: () => {
      const id = this.abiertoId();
      // Uno creado sin conexión solo existe aquí: el servidor no lo conoce todavía
      if (!id || esTemporal(id) || this.store.pedidos().some((p) => p.id === id)) return undefined;
      return id;
    },
    stream: ({ params }) => this.api.get(params),
  });

  protected readonly detalle = computed<Pedido | null>(() => {
    const id = this.abiertoId();
    if (!id) return null;
    const enTablero = this.store.pedidos().find((p) => p.id === id);
    if (enTablero) return enTablero;
    return this.fuera.hasValue() ? this.fuera.value() : null;
  });

  /** La tarjeta cuya etiqueta se está viendo. */
  protected readonly codigosDe = signal<Tarjeta | null>(null);
  protected readonly codigosTitulo = computed(() => {
    const tarjeta = this.codigosDe();
    if (!tarjeta) return 'Códigos';
    const { pedido, numero } = tarjeta;
    return `Códigos · ${pedido.jugador.name || pedido.jugador.username} · ${numero}/${pedido.lineas.length}`;
  });

  protected readonly detalleTitulo = computed(() => {
    const pedido = this.detalle();
    return pedido ? `Pedido de ${pedido.jugador.name || pedido.jugador.username}` : 'Pedido';
  });
  private readonly router = inject(Router);

  /** Desde `data` de la ruta. */
  readonly readonly = input(false);

  /** Desde la query string. */
  readonly q = input<string>();
  readonly pago = input<PaymentStatus>();
  readonly encordador = input<string>();
  /** Enlace directo a un pedido, por ejemplo desde el escáner. */
  readonly openPedido = input<string>();

  protected readonly heading = this.route.snapshot.title ?? 'Pedidos';
  protected readonly columnas = COLUMNAS;
  /** Por debajo de md: carrusel de columnas, sin arrastrar. */
  protected readonly movil = mediaQuery('(max-width: 767.98px)');
  private readonly carrusel = viewChild<ElementRef<HTMLElement>>('carrusel');
  /** La columna que se ve en el carrusel (la del borde izquierdo, por el snap-start). */
  protected readonly columnaVisible = signal(0);

  /** Distancia de cada columna al borde izquierdo del carrusel (con su padding). */
  private distancias(el: HTMLElement): number[] {
    const inicio = el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft);
    return [...el.children].map((hijo) => hijo.getBoundingClientRect().left - inicio);
  }

  private esperaEncaje?: ReturnType<typeof setTimeout>;

  protected onCarrusel(): void {
    const el = this.carrusel()?.nativeElement;
    if (!el) return;
    const distancias = this.distancias(el).map(Math.abs);
    this.columnaVisible.set(distancias.indexOf(Math.min(...distancias)));
    // Por si no llega scrollend (Safari en iPhone no lo tiene): 150 ms quieto = terminó
    clearTimeout(this.esperaEncaje);
    this.esperaEncaje = setTimeout(() => this.encajar(), 150);
  }

  /**
   * Red de seguridad del scroll-snap: si al terminar el scroll el carrusel ha quedado entre dos
   * columnas (algún navegador no encaja tras ciertos gestos), se coloca en la más cercana.
   * La última no puede llegar al borde (no hay más que deslizar): basta con el final.
   */
  protected encajar(): void {
    const el = this.carrusel()?.nativeElement;
    if (!el || !this.movil()) return;
    clearTimeout(this.esperaEncaje);
    const cercanas = this.distancias(el).map(Math.abs);
    this.columnaVisible.set(cercanas.indexOf(Math.min(...cercanas)));
    const destino = this.distancias(el)[this.columnaVisible()];
    const alFinal = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    if (Math.abs(destino) > 2 && !alFinal) el.scrollBy({ left: destino, behavior: 'smooth' });
  }

  protected irAColumna(indice: number): void {
    const el = this.carrusel()?.nativeElement;
    if (!el) return;
    // Solo en horizontal: scrollIntoView movía también la página hacia abajo
    const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: this.distancias(el)[indice], behavior: suave ? 'smooth' : 'auto' });
    this.columnaVisible.set(indice);
  }
  protected readonly jugadorPuedeCancelar = JUGADOR_PUEDE_CANCELAR;
  protected readonly limite = TABLERO_MAX;
  protected readonly pagos = Object.entries(PAYMENT_STATUS).map(([value, info]) => ({
    value,
    label: info.label,
  }));

  /** La vista de jugador no usa tiempo real: el estado del hub no le dice nada. */
  protected readonly showOffline = computed(
    () => !this.readonly() && !this.offline.modoSinConexion() && this.realtime.status() !== 'on',
  );

  /** Una tarjeta por raqueta: así se ve qué raqueta está en qué punto. */
  private readonly visibles = computed(() => {
    const pago = this.pago();
    const encordador = this.encordador();
    const busqueda = this.q() ?? '';
    return this.store
      .pedidos()
      .filter((pedido) => !pago || pedido.pago === pago)
      .filter((pedido) => !encordador || pedido.encordador.username === encordador)
      .flatMap((pedido) => tarjetasDe(pedido))
      .filter((tarjeta) => coincideTarjeta(tarjeta, busqueda));
  });

  protected readonly porColumna = computed(() => {
    const columnas: Record<Columna, Tarjeta[]> = {
      pendiente: [],
      proceso: [],
      listo: [],
      cerrado: [],
    };
    for (const tarjeta of this.visibles()) columnas[tarjeta.columna].push(tarjeta);
    columnas.pendiente.sort(porFecha);
    columnas.proceso.sort(porFecha);
    return columnas;
  });

  protected nuevo(inicial: PedidoFormValue | null, torneo: string | null = null): void {
    this.formInicial.set(inicial);
    this.torneoRepetido.set(torneo);
    this.jugadorRepetido.set(null);
    this.creando.set(true);
  }

  protected repetir(pedido: Pedido): void {
    this.cerrar();
    this.nuevo(toFormValue(pedido), pedido.tournamentId);
    const { username, name, bonos } = pedido.jugador;
    this.jugadorRepetido.set({ username, name, bonos });
  }

  /** La tarjeta es una raqueta: se cancela esa; el pedido entero, desde el detalle. */
  protected async cancelarLinea({ pedido, linea }: Tarjeta): Promise<void> {
    const actualizada = await this.cancelarLineaPedido(pedido, linea);
    if (actualizada) this.store.applyLine(pedido.id, actualizada);
  }

  protected onCreado({ pedido, enviado }: PedidoCreado): void {
    this.creando.set(false);
    if (!enviado) {
      // Ya está en el tablero (lo pone la cola), marcado «Sin enviar»
      this.toast.warning('Sin conexión: el pedido se ha guardado y se enviará al recuperarla');
      return;
    }
    this.store.applyChange(pedido);
    // En «Mis asignados» no se verá si es de otro: que no parezca que se ha perdido
    const otro = pedido.encordador.username !== this.auth.username();
    this.toast.success(
      otro
        ? `Pedido creado y asignado a ${pedido.encordador.name || pedido.encordador.username}`
        : 'Pedido creado',
    );
  }

  protected abrir(id: string): void {
    this.abiertoId.set(id);
  }

  protected cerrar(): void {
    this.abiertoId.set(null);
    if (this.openPedido()) this.setFilter('openPedido', '');
  }

  protected onLinea({ pedidoId, linea }: LineaActualizada): void {
    this.store.applyLine(pedidoId, linea);
  }

  protected onMoved({ tarjeta, columna }: TarjetaMovida): void {
    void this.store.move(tarjeta, columna);
  }

  protected onPago(event: Event): void {
    this.setFilter('pago', (event.target as HTMLSelectElement).value);
  }

  protected setFilter(key: 'q' | 'pago' | 'encordador' | 'openPedido', value: string): void {
    void this.router.navigate([], {
      queryParams: { [key]: value || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
