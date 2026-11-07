import { Injectable, effect, inject } from '@angular/core';
import { AuthStore } from '../auth/store/auth.store';
import type { EtrDb } from './etr-db';

export type { Lectura, Precargado } from './etr-db';

/**
 * Las copias caducan a los 7 días: obliga a renovarlas cada semana, pero aguanta un torneo
 * entero sin cobertura (se borran al abrir la app, también sin red).
 */
export const LECTURA_MAX_MS = 7 * 24 * 60 * 60 * 1000;

/** La base de datos del front antiguo: se borra una vez, para no dejar datos huérfanos. */
const DB_ANTIGUA = 'etr-offline';

const cargarDexie = () => import('./etr-db');

/** La base de datos que se quedó en el dispositivo (sesión caducada), para borrarla si entra otro. */
const ULTIMA_KEY = 'etr_ultima_db';

function usuarioRecordado(): string | null {
  try {
    return localStorage.getItem(ULTIMA_KEY);
  } catch {
    return null;
  }
}

function recordarUsuario(nombre: string | null): void {
  try {
    if (nombre) localStorage.setItem(ULTIMA_KEY, nombre);
    else localStorage.removeItem(ULTIMA_KEY);
  } catch {
    // Sin almacenamiento: no se puede recordar
  }
}

/**
 * Una base de datos por usuario (`etr-<userId>`): lo que se guardó para uno no lo ve el
 * siguiente que entre en el mismo dispositivo. Al cerrar sesión se borra entera; si la sesión
 * caduca se conserva hasta que vuelva a entrar (o entre otro usuario, y entonces se borra).
 * Dexie se carga bajo demanda, la primera vez que hace falta.
 */
@Injectable({ providedIn: 'root' })
export class OfflineDb {
  private readonly auth = inject(AuthStore);
  private nombre: string | null = null;
  private actual: Promise<EtrDb | null> = Promise.resolve(null);

  constructor() {
    void cargarDexie()
      .then(({ borrarDb }) => borrarDb(DB_ANTIGUA))
      .catch(() => undefined);

    effect(() => {
      const usuario = this.auth.isLoggedIn() ? this.auth.userId() : null;
      const nombre = usuario ? `etr-${usuario}` : null;
      if (nombre === this.nombre) return;

      const anterior = this.actual;
      this.nombre = nombre;
      // Cerrar sesión: lo suyo no se queda en el dispositivo. Si la sesión caduca, sí: tiene
      // cambios sin enviar que saldrán cuando vuelva a entrar
      const borrar = nombre !== null || this.auth.salidaVoluntaria;
      void anterior.then((db) => (borrar ? db?.delete() : db?.close())).catch(() => undefined);
      if (nombre === null && borrar) recordarUsuario(null);
      if (nombre) this.cambiarDeUsuario(nombre);
      this.actual = nombre ? this.abrir(nombre) : Promise.resolve(null);
    });
  }

  /** Si entra otra persona, lo que dejó la anterior al caducarle la sesión se borra. */
  private cambiarDeUsuario(nombre: string): void {
    const previo = usuarioRecordado();
    if (previo && previo !== nombre) {
      void cargarDexie()
        .then(({ borrarDb }) => borrarDb(previo))
        .catch(() => undefined);
    }
    recordarUsuario(nombre);
  }

  /** null sin sesión o si el navegador no tiene IndexedDB (modo privado de algunos). */
  db(): Promise<EtrDb | null> {
    return this.actual;
  }

  private async abrir(nombre: string): Promise<EtrDb | null> {
    try {
      const { EtrDb } = await cargarDexie();
      const db = new EtrDb(nombre);
      const limite = Date.now() - LECTURA_MAX_MS;
      await db.lecturas.where('guardadoEn').below(limite).delete();
      // Con sus copias borradas, el torneo ya no está «disponible sin conexión» (sin ✓)
      await db.precargas.filter((p) => p.guardadoEn < limite).delete();
      return db;
    } catch {
      // Sin IndexedDB la app sigue funcionando, solo que sin copia offline
      return null;
    }
  }
}
