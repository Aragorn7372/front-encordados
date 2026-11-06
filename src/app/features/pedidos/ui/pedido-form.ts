import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  FormField,
  FormRoot,
  applyEach,
  applyWhen,
  form,
  max,
  maxLength,
  min,
  required,
  validate,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { toFormErrors } from '../../../core/http/form-errors';
import { PAYMENT_STATUS } from '../../../shared/models/status';
import { FieldError } from '../../../shared/ui/field-error';
import {
  MAX_UNIDADES,
  PedidoFormValue,
  nuevaLinea,
  nuevoArticulo,
  pedidoVacio,
  precioSugerido,
  totalRaquetas,
} from '../data-access/model/pedido-form.model';
import { toPurchasedRequest } from '../data-access/mapper/pedido-request';
import { Pedido } from '../data-access/model/pedido.model';
import { JugadorOpcion, PedidosApi } from '../data-access/api/pedidos.api';
import { ContactoRapido } from './contacto-rapido';

const maquinaGuardada = (tournamentId: string) => `etr_maquina:${tournamentId}`;

@Component({
  selector: 'app-pedido-form',
  imports: [CurrencyPipe, FormField, FormRoot, FieldError, ContactoRapido],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pedido-form.html',
})
export class PedidoForm implements OnInit {
  private readonly api = inject(PedidosApi);
  private readonly auth = inject(AuthStore);

  readonly tournamentId = input.required<string>();
  /** Para repetir un pedido: datos de partida. */
  readonly inicial = input<PedidoFormValue | null>(null);
  /** Al repetir, el jugador original aunque ya no figure entre los del torneo. */
  readonly jugadorExtra = input<JugadorOpcion | null>(null);
  readonly created = output<Pedido>();
  readonly cancelled = output();

  /**
   * El encordador puede asignar el pedido a cualquier encordador del torneo, pero no puede leer
   * /workers (reservado a OWNER): de máquinas solo conoce la suya, la que guardó la última vez.
   */
  protected readonly esEncordador = computed(() => this.auth.hasRole('ENCORDER'));
  protected readonly creandoJugador = signal(false);
  protected readonly pagos = Object.entries(PAYMENT_STATUS).map(([value, info]) => ({
    value,
    label: info.label,
  }));

  private readonly datos = rxResource({
    params: () => ({ tournamentId: this.tournamentId(), conMaquinas: !this.esEncordador() }),
    stream: ({ params }) => this.api.datosNuevoPedido(params.tournamentId, params.conMaquinas),
  });

  protected readonly cargado = computed(() => this.datos.hasValue());
  private readonly jugadoresCreados = signal<JugadorOpcion[]>([]);
  protected readonly jugadores = computed(() => {
    const lista = [
      ...this.jugadoresCreados(),
      ...(this.datos.hasValue() ? this.datos.value().jugadores : []),
    ];
    const extra = this.jugadorExtra();
    return extra && !lista.some((j) => j.username === extra.username) ? [extra, ...lista] : lista;
  });
  protected readonly encordadores = computed(() => {
    const lista = this.datos.hasValue() ? this.datos.value().encordadores : [];
    if (!this.esEncordador()) return lista;
    // Él primero, con su máquina guardada, aunque el detalle del torneo no le incluyera
    const yo = this.auth.username() ?? '';
    const propio = {
      username: yo,
      name: lista.find((e) => e.username === yo)?.name ?? yo,
      maquina: localStorage.getItem(maquinaGuardada(this.tournamentId())) || null,
    };
    return [propio, ...lista.filter((e) => e.username !== yo)];
  });
  protected readonly maquinas = computed(() => [
    ...new Set(this.encordadores().flatMap((e) => (e.maquina ? [e.maquina] : []))),
  ]);

  protected readonly model = signal<PedidoFormValue>(pedidoVacio());
  /** La última máquina rellenada al elegir encordador, para distinguirla de la escrita a mano. */
  private maquinaPuesta: string | null = null;

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.jugador, { message: 'Elige el jugador' });
      required(path.encordador, { message: 'Elige el encordador' });
      required(path.maquina, { message: 'Indica la máquina' });
      maxLength(path.maquina, 100, { message: 'No puede superar 100 caracteres' });
      required(path.fecha, { message: 'Indica para cuándo es' });
      min(path.precio, 0.01, { message: 'El precio debe ser mayor que 0' });
      maxLength(path.comentarios, 480, { message: 'No puede superar 480 caracteres' });

      applyWhen(
        path,
        ({ value }) => value().tipo === 'encordado',
        (encordado) => {
          validate(encordado.lineas, ({ value }) =>
            value().length > 0
              ? undefined
              : { kind: 'vacio', message: 'Añade al menos una raqueta' },
          );
          applyEach(encordado.lineas, (linea) => {
            required(linea.raqueta, { message: 'Indica la raqueta' });
            maxLength(linea.raqueta, 200, { message: 'No puede superar 200 caracteres' });
            min(linea.cantidad, 1, { message: 'Al menos 1' });
            max(linea.cantidad, MAX_UNIDADES, { message: `Como mucho ${MAX_UNIDADES}` });
            maxLength(linea.color, 100, { message: 'No puede superar 100 caracteres' });
            required(linea.cuerdaV, { message: 'Indica la cuerda' });
            min(linea.tensionV, 5, { message: 'Entre 5 y 40 kg' });
            max(linea.tensionV, 40, { message: 'Entre 5 y 40 kg' });
            min(linea.tensionH, 5, { message: 'Entre 5 y 40 kg' });
            max(linea.tensionH, 40, { message: 'Entre 5 y 40 kg' });
            min(linea.preestiradoV, 0, { message: 'Entre 0 y 20 %' });
            max(linea.preestiradoV, 20, { message: 'Entre 0 y 20 %' });
            min(linea.preestiradoH, 0, { message: 'Entre 0 y 20 %' });
            max(linea.preestiradoH, 20, { message: 'Entre 0 y 20 %' });
            min(linea.nudos, 0, { message: 'No puede ser negativo' });
            max(linea.nudos, 255, { message: 'Demasiados nudos' });
          });
        },
      );

      applyWhen(
        path,
        ({ value }) => value().tipo === 'taller',
        (taller) => {
          applyEach(taller.articulos, (articulo) => {
            required(articulo.articulo, { message: 'Indica el artículo' });
            min(articulo.cantidad, 1, { message: 'Al menos 1' });
            min(articulo.precio, 0, { message: 'No puede ser negativo' });
          });
        },
      );
    },
    {
      submission: {
        action: async (field) => {
          const value = field().value();
          try {
            const pedido = await firstValueFrom(
              this.api.create(toPurchasedRequest(value, this.tournamentId())),
            );
            // Solo la suya: si lo asigna a otro, esa máquina no es la de él
            if (this.esEncordador() && value.encordador === this.auth.username()) {
              localStorage.setItem(maquinaGuardada(this.tournamentId()), value.maquina.trim());
            }
            this.created.emit(pedido);
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );

  protected readonly raquetas = computed(() => totalRaquetas(this.model()));

  protected readonly jugador = computed(
    () => this.jugadores().find((j) => j.username === this.model().jugador) ?? null,
  );

  /** El backend cobra con bonos si alcanzan, diga lo que diga el estado de pago. */
  protected readonly avisoBonos = computed(() => {
    const jugador = this.jugador();
    const precio = this.model().precio;
    if (!jugador || jugador.bonos <= 0) return null;
    if (jugador.bonos >= precio) {
      return `Se pagará con bonos: le quedarán ${jugador.bonos - precio} de ${jugador.bonos}.`;
    }
    return `Tiene ${jugador.bonos} en bonos, no alcanzan: el pedido quedará pendiente de pago.`;
  });

  constructor() {
    // Precio sugerido mientras nadie lo toque a mano
    effect(() => {
      const sugerido = precioSugerido(this.model());
      if (!this.form.precio().dirty() && this.model().precio !== sugerido) {
        this.model.update((value) => ({ ...value, precio: sugerido }));
      }
    });
  }

  /**
   * Al elegir encordador se pone su máquina; luego se puede cambiar a mano.
   * Es un evento y no un effect: un effect que lee y escribe `model` se realimenta sin fin.
   */
  protected onEncordador(event: Event): void {
    const username = (event.target as HTMLSelectElement).value;
    const maquina = this.encordadores().find((e) => e.username === username)?.maquina ?? '';
    // Sin máquina propia se quita la del anterior, pero no la escrita a mano
    if (!maquina && this.model().maquina !== this.maquinaPuesta) return;
    this.maquinaPuesta = maquina;
    this.model.update((value) => ({ ...value, maquina }));
  }

  ngOnInit() {
    const inicial = this.inicial();
    // Repetir conserva el encordador y la máquina del original; uno nuevo, el propio encordador
    if (inicial || !this.esEncordador()) {
      this.model.set(inicial ?? pedidoVacio());
      return;
    }
    const maquina = localStorage.getItem(maquinaGuardada(this.tournamentId())) ?? '';
    // Rellenada por nosotros: si elige a otro encordador, se quita
    this.maquinaPuesta = maquina;
    this.model.set({ ...pedidoVacio(), encordador: this.auth.username() ?? '', maquina });
  }

  protected setTipo(tipo: PedidoFormValue['tipo']): void {
    this.model.update((value) => ({ ...value, tipo }));
  }

  protected addLinea(): void {
    this.model.update((value) => ({
      ...value,
      lineas: [...value.lineas, nuevaLinea(value.lineas.at(-1))],
    }));
  }

  /** Una raqueta con fecha propia; vacío vuelve a la del pedido. Se empieza desde esa. */
  protected setFechaLinea(index: number, fecha: string): void {
    this.model.update((value) => ({
      ...value,
      lineas: value.lineas.map((linea, i) => (i === index ? { ...linea, fecha } : linea)),
    }));
  }

  protected removeLinea(index: number): void {
    this.model.update((value) => ({
      ...value,
      lineas: value.lineas.filter((_, i) => i !== index),
    }));
  }

  protected addArticulo(): void {
    this.model.update((value) => ({ ...value, articulos: [...value.articulos, nuevoArticulo()] }));
  }

  protected removeArticulo(index: number): void {
    this.model.update((value) => ({
      ...value,
      articulos: value.articulos.filter((_, i) => i !== index),
    }));
  }

  protected onJugadorCreado(jugador: JugadorOpcion): void {
    this.jugadoresCreados.update((lista) => [jugador, ...lista]);
    this.model.update((value) => ({ ...value, jugador: jugador.username }));
    this.creandoJugador.set(false);
  }
}
