import {
  EnvironmentInjector,
  InjectionToken,
  Provider,
  Type,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { crearInyectorDeFondo } from './fondo';
import type { ManejadorOutbox } from './outbox';
import type { Precarga } from './precarga';

/** Lo que cada feature hace sin conexión: qué guarda de un torneo y cómo envía su cola. */
export interface FuncionesOffline {
  precargas: Precarga[];
  manejadores: ManejadorOutbox[];
}

/**
 * Cómo cargarlas. Van en un chunk propio porque traen los clientes y mappers de todas las
 * features: en la carga inicial no hacen falta, y el login no las usa.
 */
export const FUNCIONES_OFFLINE = new InjectionToken<() => Promise<FuncionesOffline>>(
  'FUNCIONES_OFFLINE',
  { factory: () => () => Promise.resolve({ precargas: [], manejadores: [] }) },
);

/** En app.config, que es quien conoce todas las features. */
export function provideFuncionesOffline(cargar: () => Promise<FuncionesOffline>): Provider {
  return { provide: FUNCIONES_OFFLINE, useValue: cargar };
}

export interface Cargadas<T> {
  elementos: T[];
  /** Con los clientes de sus APIs y sin el interceptor de errores (ver crearInyectorDeFondo). */
  injector: EnvironmentInjector;
}

/**
 * Para un servicio: una función que las carga la primera vez que se llama y luego devuelve lo
 * mismo. Si falla (sin red y sin el chunk descargado), lo intenta de nuevo la vez siguiente.
 * Se llama en un contexto de inyección.
 */
export function injectFuncionesOffline<T extends { api: Type<unknown> }>(
  elegir: (funciones: FuncionesOffline) => T[],
): () => Promise<Cargadas<T>> {
  const cargar = inject(FUNCIONES_OFFLINE);
  const entorno = inject(EnvironmentInjector);
  let cargadas: Promise<Cargadas<T>> | null = null;

  const crear = (funciones: FuncionesOffline): Cargadas<T> => {
    const elementos = elegir(funciones);
    const apis = [...new Set(elementos.map((e) => e.api))];
    return {
      elementos,
      injector: runInInjectionContext(entorno, () => crearInyectorDeFondo(apis)),
    };
  };

  return () =>
    (cargadas ??= cargar()
      .then(crear)
      .catch((error: unknown) => {
        cargadas = null;
        throw error;
      }));
}
