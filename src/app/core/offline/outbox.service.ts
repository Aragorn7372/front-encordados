import { HttpErrorResponse } from '@angular/common/http';
import {
  EnvironmentInjector,
  Injectable,
  InjectionToken,
  computed,
  effect,
  inject,
  runInInjectionContext,
  signal,
  untracked,
} from '@angular/core';
import { Observable, Subject, firstValueFrom, throwError, timeout } from 'rxjs';
import { AuthStore } from '../auth/store/auth.store';
import { AppError, esSinServidor, toAppError } from '../http/app-error';
import { PwaService } from '../pwa/pwa.service';
import { ToastService } from '../toast/toast.service';
import { injectFuncionesOffline } from './funciones-offline';
import type { EtrDb } from './etr-db';
import { OfflineDb } from './offline-db';
import { OfflineState } from './offline-state';
import { ManejadorOutbox, Operacion, Resultado, sustituirIds, temporalesEn } from './outbox';

/** Con red, una escritura que se puede repetir no espera más que esto antes de ir a la cola. */
export const ESPERA_ENVIO_MS = new InjectionToken<number>('ESPERA_ENVIO_MS', {
  factory: () => 8000,
});

/** Tras un fallo de red se reintenta solo, cada vez más espaciado (sin sondeos fijos). */
export const REINTENTOS_MS = new InjectionToken<number[]>('REINTENTOS_MS', {
  factory: () => [15_000, 30_000, 60_000, 120_000, 300_000],
});

export interface OperacionEnviada {
  /** Con los ids temporales ya cambiados por los reales. */
  operacion: Operacion;
  respuesta: unknown;
}

const estadoDe = (error: unknown): number => {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : -1;
};

const aAppError = (error: unknown): AppError =>
  error instanceof HttpErrorResponse ? toAppError(error) : (error as AppError);

/**
 * La cola de escrituras sin conexión (outbox). Cada operación es un objeto tipado que guarda la
 * feature, y se envía en orden con el manejador que esa feature registró. Vive en la base de
 * datos del usuario: sobrevive a cerrar la app y a que caduque la sesión.
 */
@Injectable({ providedIn: 'root' })
export class OutboxService {
  private readonly offlineDb = inject(OfflineDb);
  private readonly offline = inject(OfflineState);
  private readonly pwa = inject(PwaService);
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly espera = inject(ESPERA_ENVIO_MS);
  private readonly reintentos = inject(REINTENTOS_MS);
  /** Los manejadores de las features y un cliente sin el interceptor de errores (fondo.ts). */
  private readonly cargarManejadores = injectFuncionesOffline((funciones) => funciones.manejadores);
  private manejadores = new Map<string, ManejadorOutbox>();
  private fondo: EnvironmentInjector | null = null;
  private listos: Promise<void> | null = null;

  /** Toda la cola, en orden: pendientes y fallidas. */
  readonly operaciones = signal<Operacion[]>([]);
  readonly pendientes = computed(() => this.operaciones().filter((o) => o.estado === 'pendiente'));
  readonly fallidas = computed(() => this.operaciones().filter((o) => o.estado === 'fallida'));
  /** Id temporal → id real, de lo creado sin conexión que ya se ha enviado. */
  readonly ids = signal<Record<string, string>>({});
  readonly enviando = signal(false);
  readonly puede = computed(
    () => this.auth.isLoggedIn() && !this.offline.modoSinConexion() && this.pwa.conectado(),
  );

  private readonly enviadas = new Subject<OperacionEnviada>();
  /** Cada operación de la cola que llega al servidor, con su respuesta, para aplicarla. */
  readonly enviadas$ = this.enviadas.asObservable();
  private readonly sincronizada = new Subject<void>();
  /** Al acabar de vaciar la cola (si se envió algo): momento de pedir datos frescos. */
  readonly sincronizada$ = this.sincronizada.asObservable();
  private readonly propias = new Subject<unknown>();
  /**
   * Cada escritura de este usuario justo antes de salir hacia el servidor (directa o desde la
   * cola), con los ids ya reales. El tiempo real se la devolverá: así se sabe que es suya.
   */
  readonly propias$ = this.propias.asObservable();

  private carga: Promise<void> = Promise.resolve();
  private reintento: ReturnType<typeof setTimeout> | null = null;
  private fallosSeguidos = 0;
  /** El envío en curso: mientras exista, nadie más empieza otro. */
  private envio: Promise<void> | null = null;

  constructor() {
    // Que estén descargados mientras hay red: sin red puede no haber forma de traerlos
    void this.preparar().catch(() => undefined);
    // Cada usuario tiene su cola, en su base de datos
    effect(() => {
      void this.auth.userId();
      void this.auth.isLoggedIn();
      untracked(() => (this.carga = this.cargar()));
    });
    // Vuelve la red (o se sale del modo sin conexión, o se entra): se intenta, aunque la última
    // lectura fallara, porque nadie más va a pedir nada para comprobarlo
    effect(() => {
      if (this.puede()) untracked(() => void this.sincronizar());
    });
    // Con poca cobertura el navegador no avisa: en cuanto el servidor contesta algo, se envía
    effect(() => {
      if (!this.offline.sinServidor() && untracked(this.puede)) {
        untracked(() => void this.sincronizar());
      }
    });
  }

  /**
   * Con red y sin nada esperando delante, se envía ya; si no, a la cola (en orden: un cambio
   * no puede adelantar a otro anterior). Los errores que no son de red se lanzan, como sin cola,
   * para que el formulario los pinte; `avisarError` los muestra además en un toast.
   */
  async ejecutar<R>(
    tipo: string,
    payload: unknown,
    descripcion: string,
    { avisarError = false } = {},
  ): Promise<Resultado<R>> {
    await Promise.all([this.carga, this.preparar()]);
    const manejador = this.manejador(tipo);
    const encolar = async (): Promise<Resultado<R>> => {
      await this.encolar(tipo, payload, descripcion);
      return { enviada: false };
    };
    const esperando = this.pendientes().length > 0;
    if (!this.puede() || esperando || this.dependencias(manejador, payload).length) {
      return encolar();
    }

    try {
      let peticion = this.enviar(manejador, sustituirIds(payload, this.ids()));
      if (manejador.idempotente) {
        const sinRespuesta = () =>
          new HttpErrorResponse({ status: 0, statusText: 'Sin respuesta' });
        peticion = peticion.pipe(
          timeout({ first: this.espera, with: () => throwError(sinRespuesta) }),
        );
      }
      return { enviada: true, respuesta: (await firstValueFrom(peticion)) as R };
    } catch (error) {
      const status = estadoDe(error);
      if (esSinServidor(status)) {
        this.offline.sinRed();
        // Acaba de fallar: no se reintenta en el acto, sino con la espera de siempre
        this.programarReintento();
        return encolar();
      }
      if (status === 401) {
        // Sesión caducada: el cambio se guarda y sale cuando vuelva a entrar
        const resultado = await encolar();
        this.auth.logout('Tu sesión ha caducado. Tus cambios se enviarán cuando vuelvas a entrar');
        return resultado;
      }
      const appError = aAppError(error);
      if (avisarError) this.toast.error(appError.message);
      throw appError;
    }
  }

  /**
   * Envía en orden lo pendiente. Se para al primer fallo de red y lo reintenta más tarde.
   * Al volver la conexión la piden a la vez varios avisos (red, servidor, recarga): el candado
   * se toma antes de cualquier await, o dos envíos crearían el mismo pedido dos veces.
   */
  sincronizar(): Promise<void> {
    this.envio ??= this.vaciar()
      .catch(() => undefined) // Que un error inesperado no deje el candado cogido
      .then(() => {
        this.envio = null;
        // Si algo entró justo al terminar (ya fuera del bucle), no se queda esperando
        if (this.puede() && !this.reintento && this.pendientes().length) void this.sincronizar();
      });
    return this.envio;
  }

  private async vaciar(): Promise<void> {
    try {
      await Promise.all([this.carga, this.preparar()]);
    } catch {
      // Sin los manejadores (sin red y sin el chunk descargado): más tarde, no en bucle
      this.programarReintento();
      return;
    }
    if (!this.puede() || this.pendientes().length === 0) return;
    const db = await this.offlineDb.db();
    this.cancelarReintento();
    this.enviando.set(true);
    let enviadas = 0;
    try {
      // Una a una y en orden: cada una puede necesitar el id real que da la anterior. Lo que
      // se encola mientras tanto entra en este mismo bucle
      for (let op = this.pendientes()[0]; op && this.puede(); op = this.pendientes()[0]) {
        const resultado = await this.enviarUna(op, db);
        if (resultado === 'parar') break;
        if (resultado === 'enviada') enviadas++;
      }
    } finally {
      this.enviando.set(false);
      if (this.operaciones().length === 0 && Object.keys(this.ids()).length) {
        this.ids.set({});
        await db?.ids.clear().catch(() => undefined);
      }
      if (enviadas) this.sincronizada.next();
    }
  }

  private async enviarUna(
    op: Operacion,
    db: EtrDb | null,
  ): Promise<'enviada' | 'fallida' | 'parar'> {
    const manejador = this.manejadores.get(op.tipo);
    if (!manejador) {
      await this.marcarFallida(op, 'Este cambio ya no se puede enviar');
      return 'fallida';
    }
    const payload = sustituirIds(op.payload, this.ids());
    if (this.dependencias(manejador, payload).length) {
      await this.marcarFallida(op, 'Depende de otro cambio que no se ha podido enviar');
      return 'fallida';
    }
    try {
      const respuesta = await firstValueFrom(this.enviar(manejador, payload));
      const nuevos = manejador.idsCreados?.(op.payload, respuesta) ?? {};
      if (Object.keys(nuevos).length) {
        const filas = Object.entries(nuevos).map(([tmp, real]) => ({ tmp, real }));
        await db?.ids.bulkPut(filas).catch(() => undefined);
        this.ids.update((ids) => ({ ...ids, ...nuevos }));
      }
      // Primero se aplica la respuesta y luego sale de la cola: así no parpadea
      this.enviadas.next({ operacion: { ...op, payload }, respuesta });
      await this.quitar([op]);
      this.fallosSeguidos = 0;
      return 'enviada';
    } catch (error) {
      const status = estadoDe(error);
      // Sin red o sin sesión: se queda pendiente, igual que todo lo que va detrás
      if (esSinServidor(status) || status === 401) {
        if (status !== 401) this.offline.sinRed();
        this.programarReintento();
        return 'parar';
      }
      await this.marcarFallida(op, aAppError(error).message);
      return 'fallida';
    }
  }

  async reintentar(op: Operacion): Promise<void> {
    await this.actualizar(op, { estado: 'pendiente', error: undefined });
    await this.sincronizar();
  }

  /** Quita un cambio y lo que dependía de él (mover una raqueta de un pedido que no se creará). */
  async descartar(op: Operacion): Promise<void> {
    await this.preparar();
    const creado = this.manejadores.get(op.tipo)?.crea?.(op.payload);
    const dependientes = creado
      ? this.operaciones().filter(
          (o) => o.id !== op.id && temporalesEn(o.payload).some((id) => id.startsWith(creado)),
        )
      : [];
    await this.quitar([op, ...dependientes]);
  }

  /** Para cancelar algo creado sin conexión: si aún no se ha enviado, basta con no enviarlo. */
  async descartarCreacion(tempId: string): Promise<boolean> {
    await this.preparar();
    const op = this.pendientes().find(
      (o) => this.manejadores.get(o.tipo)?.crea?.(o.payload) === tempId,
    );
    // Si justo se está enviando, ya no se puede retirar
    if (!op || (this.enviando() && op.id === this.pendientes()[0]?.id)) return false;
    await this.descartar(op);
    return true;
  }

  private preparar(): Promise<void> {
    return (this.listos ??= this.cargarManejadores()
      .then(({ elementos, injector }) => {
        this.manejadores = new Map(elementos.map((manejador) => [manejador.tipo, manejador]));
        this.fondo = injector;
      })
      .catch((error: unknown) => {
        this.listos = null;
        throw error;
      }));
  }

  private manejador(tipo: string): ManejadorOutbox {
    const manejador = this.manejadores.get(tipo);
    if (!manejador) throw new Error(`No hay manejador de outbox para «${tipo}»`);
    return manejador;
  }

  private enviar(manejador: ManejadorOutbox, payload: unknown): Observable<unknown> {
    this.propias.next(payload);
    const fondo = this.fondo!;
    return runInInjectionContext(fondo, () => manejador.enviar(fondo.get(manejador.api), payload));
  }

  /** Ids temporales que usa y que no son suyos: mientras no tengan id real, no se puede enviar. */
  private dependencias(manejador: ManejadorOutbox, payload: unknown): string[] {
    const creado = manejador.crea?.(payload);
    return temporalesEn(sustituirIds(payload, this.ids())).filter(
      (id) => !creado || !id.startsWith(creado),
    );
  }

  private async encolar(tipo: string, payload: unknown, descripcion: string): Promise<void> {
    const op: Operacion = {
      tipo,
      payload,
      descripcion,
      creadaEn: Date.now(),
      estado: 'pendiente',
      intentos: 0,
    };
    const db = await this.offlineDb.db();
    // Sin IndexedDB (modo privado) la cola vive solo mientras la app esté abierta
    op.id = (await db?.outbox.add(op).catch(() => undefined)) ?? -Date.now();
    this.operaciones.update((ops) => [...ops, op]);
    if (this.puede() && !this.reintento) void this.sincronizar();
  }

  private async marcarFallida(op: Operacion, error: string): Promise<void> {
    await this.actualizar(op, { estado: 'fallida', error, intentos: op.intentos + 1 });
  }

  private async actualizar(op: Operacion, cambios: Partial<Operacion>): Promise<void> {
    const nueva = { ...op, ...cambios };
    const db = await this.offlineDb.db();
    if (op.id && op.id > 0) await db?.outbox.put(nueva).catch(() => undefined);
    this.operaciones.update((ops) => ops.map((o) => (o.id === op.id ? nueva : o)));
  }

  private async quitar(ops: Operacion[]): Promise<void> {
    const ids = new Set(ops.map((o) => o.id));
    const guardadas = [...ids].filter((id): id is number => !!id && id > 0);
    const db = await this.offlineDb.db();
    await db?.outbox.bulkDelete(guardadas).catch(() => undefined);
    this.operaciones.update((lista) => lista.filter((o) => !ids.has(o.id)));
  }

  private async cargar(): Promise<void> {
    this.cancelarReintento();
    this.operaciones.set([]);
    this.ids.set({});
    const db = await this.offlineDb.db();
    if (!db) return;
    try {
      const [ops, ids] = await Promise.all([db.outbox.toArray(), db.ids.toArray()]);
      this.operaciones.set(ops);
      this.ids.set(Object.fromEntries(ids.map(({ tmp, real }) => [tmp, real])));
    } catch {
      // Base de datos bloqueada o sin abrir: sin cola guardada
    }
  }

  private programarReintento(): void {
    this.cancelarReintento();
    const espera = this.reintentos[Math.min(this.fallosSeguidos, this.reintentos.length - 1)];
    this.fallosSeguidos++;
    this.reintento = setTimeout(() => {
      this.reintento = null;
      void this.sincronizar();
    }, espera);
  }

  private cancelarReintento(): void {
    if (this.reintento) clearTimeout(this.reintento);
    this.reintento = null;
  }
}
