import { Type } from '@angular/core';
import { Observable } from 'rxjs';
import type { OperacionGuardada } from './etr-db';

export type Operacion = OperacionGuardada;

/** Lo que ha devuelto `ejecutar`: la respuesta del servidor, o que ha quedado en la cola. */
export type Resultado<R> = { enviada: true; respuesta: R } | { enviada: false };

const PREFIJO = 'tmp-';

/** Para lo que se crea sin conexión: el id real lo pondrá el servidor al enviarlo. */
export function idTemporal(): string {
  const aleatorio =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return PREFIJO + aleatorio;
}

export function esTemporal(id: string | null | undefined): boolean {
  return !!id && id.startsWith(PREFIJO);
}

/** Objetos de datos, no un File, un Blob o una fecha: esos se guardan y se envían tal cual. */
const esPlano = (valor: unknown): valor is Record<string, unknown> =>
  !!valor && typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype;

/** Cambia en el payload los ids temporales que ya tienen id real. */
export function sustituirIds<P>(payload: P, ids: Record<string, string>): P {
  if (typeof payload === 'string') return (ids[payload] ?? payload) as P;
  if (Array.isArray(payload)) return payload.map((v) => sustituirIds(v, ids)) as P;
  if (esPlano(payload)) {
    return Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, sustituirIds(v, ids)]),
    ) as P;
  }
  return payload;
}

/** Los ids temporales que aparecen en un payload. */
export function temporalesEn(payload: unknown): string[] {
  if (typeof payload === 'string') return esTemporal(payload) ? [payload] : [];
  if (Array.isArray(payload)) return payload.flatMap(temporalesEn);
  if (esPlano(payload)) return Object.values(payload).flatMap(temporalesEn);
  return [];
}

/**
 * Cómo se envía un tipo de operación. Lo registra la feature (core no conoce pedidos) y se
 * envía con su propio cliente API, el mismo que usaría con conexión.
 */
export interface ManejadorOutbox<A = unknown, P = unknown, R = unknown> {
  tipo: string;
  api: Type<A>;
  /** El payload llega con los ids temporales ya cambiados por los reales. */
  enviar(api: A, payload: P): Observable<R>;
  /** Si crea algo: su id temporal. Los ids que empiezan por él son suyos, no dependencias. */
  crea?(payload: P): string;
  /** Al enviarla, qué id real corresponde a cada temporal que creó. */
  idsCreados?(payload: P, respuesta: R): Record<string, string>;
  /**
   * Repetirla deja lo mismo (poner un estado, editar, cancelar): si la red tarda, se encola
   * sin esperar. Crear no lo es: si la respuesta se pierde, repetirla duplicaría el pedido.
   */
  idempotente?: boolean;
  /**
   * Para lo que no es idempotente: si salió hacia el servidor y no se sabe si llegó, busca en
   * el servidor lo que habría creado. Lo encontrado se toma como su respuesta (y no se repite);
   * null si no está y hay que enviarla. Sin `comprobar`, no se reenvía a ciegas: queda fallida
   * para que el usuario lo mire.
   */
  comprobar?(api: A, payload: P, contexto: ContextoComprobacion): Observable<R | null>;
}

export interface ContextoComprobacion {
  /** Cuándo salió por primera vez: lo creado antes no puede ser suyo. */
  desde: number;
  /** Ids reales que ya son de otras creaciones: no se pueden adoptar dos veces. */
  usados: ReadonlySet<string>;
}

/** Con sus tipos, para que `enviar` sepa qué cliente y qué payload recibe. */
export function definirManejador<A, P, R>(
  manejador: ManejadorOutbox<A, P, R>,
): ManejadorOutbox<A, P, R> {
  return manejador;
}
