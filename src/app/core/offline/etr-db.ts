import Dexie, { Table } from 'dexie';

/** Una respuesta GET guardada, tal cual llegó, para servirla sin conexión. */
export interface Lectura {
  /** La URL completa con sus parámetros: cada combinación es una copia distinta. */
  clave: string;
  cuerpo: unknown;
  /** Epoch ms: para decir «datos guardados el…» y para caducarla. */
  guardadoEn: number;
}

/** Un torneo (o «mis pedidos» del jugador) descargado para usarlo sin conexión. */
export interface Precargado {
  /** El id del torneo, o «todos» / «mis-pedidos» cuando no hay uno. */
  clave: string;
  guardadoEn: number;
  hechas: number;
  total: number;
}

/** Una escritura hecha sin conexión, esperando a enviarse (en orden de `id`). */
export interface OperacionGuardada {
  id?: number;
  /** Qué es (`pedido.crear`…): lo envía el manejador que la feature registró para ese tipo. */
  tipo: string;
  payload: unknown;
  /** Para el panel de pendientes: «Mover Pure Aero de Ana a En proceso». */
  descripcion: string;
  creadaEn: number;
  estado: 'pendiente' | 'fallida';
  error?: string;
  intentos: number;
}

/** Un id temporal que ya tiene id real: para las operaciones que lo usaban. */
export interface IdTemporal {
  tmp: string;
  real: string;
}

/**
 * La base de datos de un usuario. En su propio fichero para que Dexie (~100 kB) se descargue
 * solo al usarla y no en la carga inicial.
 */
export class EtrDb extends Dexie {
  lecturas!: Table<Lectura, string>;
  precargas!: Table<Precargado, string>;
  outbox!: Table<OperacionGuardada, number>;
  ids!: Table<IdTemporal, string>;

  constructor(nombre: string) {
    super(nombre);
    this.version(1).stores({ lecturas: 'clave, guardadoEn' });
    // v2: qué torneos están guardados para usarlos sin conexión
    this.version(2).stores({ lecturas: 'clave, guardadoEn', precargas: 'clave' });
    // v3: la cola de escrituras sin conexión y los ids temporales ya resueltos
    this.version(3).stores({
      lecturas: 'clave, guardadoEn',
      precargas: 'clave',
      outbox: '++id',
      ids: 'tmp',
    });
  }
}

/** Borra una base de datos por nombre, exista o no. */
export function borrarDb(nombre: string): Promise<void> {
  return Dexie.delete(nombre);
}
