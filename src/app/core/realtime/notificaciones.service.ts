import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LINE_STATUS, LineStatus, estadoLinea } from '../../shared/models/status';
import { AuthStore } from '../auth/store/auth.store';
import { OutboxService } from '../offline/outbox.service';
import { TournamentNotification } from './realtime.models';
import { RealtimeService } from './realtime.service';

export interface Notificacion {
  /** Para el `track`: el evento no trae id propio. */
  id: string;
  pedidoId: string;
  texto: string;
  /** Epoch ms. */
  cuando: number;
}

/** Las que se guardan: la campana es un aviso, no un historial. */
export const MAX_NOTIFICACIONES = 30;
/** Un evento de algo que acaba de cambiar este usuario es el eco de su cambio: no se avisa. */
export const ECO_PROPIO_MS = 20_000;

const clave = (userId: string) => `etr_notificaciones:${userId}`;

/** Lo mínimo de cada evento para escribir el aviso. `purchased` llega sin tipar. */
interface PedidoEvento {
  player?: { name?: string; username?: string };
  lineas?: unknown[];
}
interface LineaEvento {
  raquetModel?: string;
  status?: LineStatus | number;
}

/** El aviso en palabras. null si no hay nada útil que decir. */
export function textoNotificacion(evento: TournamentNotification): string | null {
  const pedido = (evento.purchased ?? {}) as PedidoEvento;
  const jugador = pedido.player?.name || pedido.player?.username || 'un jugador';
  const linea = (evento.purchased ?? {}) as LineaEvento;
  const raqueta = linea.raquetModel ? `«${linea.raquetModel}»` : 'Una raqueta';
  switch (evento.tipo) {
    case 'PEDIDO_CREADO': {
      const n = pedido.lineas?.length ?? 0;
      return `Nuevo pedido de ${jugador}${n ? ` (${n} ${n === 1 ? 'raqueta' : 'raquetas'})` : ''}`;
    }
    case 'PEDIDO_ACTUALIZADO':
      return `Pedido de ${jugador} modificado`;
    case 'PEDIDO_CANCELADO':
      return `Pedido de ${jugador} cancelado`;
    case 'ESTATUS_LINEA_PEDIDO_ACTUALIZADA': {
      const estado = linea.status === undefined ? null : LINE_STATUS[estadoLinea(linea.status)];
      return estado ? `${raqueta}: ${estado.label}` : `${raqueta} cambió de estado`;
    }
    case 'LINEA_PEDIDO_ACTUALIZADA':
      return `${raqueta} modificada`;
    default:
      return null;
  }
}

/** Todos los textos de un payload (ids, usernames…): lo que identifica un cambio propio. */
function textosDe(valor: unknown): string[] {
  if (typeof valor === 'string') return [valor];
  if (Array.isArray(valor)) return valor.flatMap(textosDe);
  if (valor && typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype) {
    return Object.values(valor).flatMap(textosDe);
  }
  return [];
}

/**
 * La campana: lo que cambian los demás en tiempo real (pedidos nuevos, raquetas que avanzan,
 * cancelaciones). Lo de uno mismo no se avisa: el hub se lo devuelve también a quien lo hizo,
 * y se reconoce porque acaba de salir por la cola de escrituras. Se guarda por usuario.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly auth = inject(AuthStore);

  readonly lista = signal<Notificacion[]>([]);
  private readonly vistasHasta = signal(0);
  readonly sinLeer = computed(
    () => this.lista().filter((n) => n.cuando > this.vistasHasta()).length,
  );

  /** Texto (id, username) → hasta cuándo se considera eco de un cambio propio. */
  private readonly propios = new Map<string, number>();
  private siguiente = 0;

  constructor() {
    inject(RealtimeService)
      .events$.pipe(takeUntilDestroyed())
      .subscribe((evento) => this.recibir(evento));
    inject(OutboxService)
      .propias$.pipe(takeUntilDestroyed())
      .subscribe((payload) => this.marcarPropio(payload));

    // Cada usuario, las suyas
    effect(() => {
      const userId = this.auth.userId();
      untracked(() => this.cargar(userId));
    });
  }

  /** Al abrir la campana: ya se han visto. */
  marcarLeidas(): void {
    this.vistasHasta.set(Date.now());
    this.guardar();
  }

  borrar(): void {
    this.lista.set([]);
    this.guardar();
  }

  private recibir(evento: TournamentNotification): void {
    const texto = textoNotificacion(evento);
    if (!texto || this.esEcoPropio(evento)) return;
    const cuando = Date.parse(evento.timestamp) || Date.now();
    const nueva: Notificacion = {
      id: `${cuando}-${this.siguiente++}`,
      pedidoId: evento.pedidoId,
      texto,
      cuando,
    };
    this.lista.update((lista) => [nueva, ...lista].slice(0, MAX_NOTIFICACIONES));
    this.guardar();
  }

  private esEcoPropio(evento: TournamentNotification): boolean {
    const ahora = Date.now();
    for (const [texto, hasta] of this.propios) if (hasta < ahora) this.propios.delete(texto);
    const pedido = (evento.purchased ?? {}) as PedidoEvento;
    // Al crear, el id lo da el servidor: se reconoce por el jugador que se acaba de enviar
    const claves = [evento.pedidoId, evento.lineaId, pedido.player?.username];
    return claves.some((c) => !!c && this.propios.has(c));
  }

  private marcarPropio(payload: unknown): void {
    const hasta = Date.now() + ECO_PROPIO_MS;
    for (const texto of textosDe(payload)) this.propios.set(texto, hasta);
  }

  private cargar(userId: string | null): void {
    this.propios.clear();
    if (!userId) {
      this.lista.set([]);
      this.vistasHasta.set(0);
      return;
    }
    try {
      const datos = JSON.parse(localStorage.getItem(clave(userId)) ?? 'null') as {
        lista?: Notificacion[];
        vistasHasta?: number;
      } | null;
      this.lista.set(Array.isArray(datos?.lista) ? datos.lista.slice(0, MAX_NOTIFICACIONES) : []);
      this.vistasHasta.set(datos?.vistasHasta ?? 0);
    } catch {
      this.lista.set([]);
      this.vistasHasta.set(0);
    }
  }

  private guardar(): void {
    const userId = this.auth.userId();
    if (!userId) return;
    try {
      localStorage.setItem(
        clave(userId),
        JSON.stringify({ lista: this.lista(), vistasHasta: this.vistasHasta() }),
      );
    } catch {
      // Sin almacenamiento: duran hasta recargar
    }
  }
}
