import {
  Injectable,
  computed,
  effect,
  inject,
  runInInjectionContext,
  signal,
  untracked,
} from '@angular/core';
import { catchError, firstValueFrom, forkJoin, map, of } from 'rxjs';
import { AuthStore } from '../auth/store/auth.store';
import { PwaService } from '../pwa/pwa.service';
import { TournamentContext } from '../tournament-context/tournament-context';
import { injectFuncionesOffline } from './funciones-offline';
import { OfflineDb, Precargado } from './offline-db';
import { OfflineState } from './offline-state';
import { ContextoPrecarga } from './precarga';

/** Si se guardó hace menos de esto, elegir el torneo otra vez no lo vuelve a descargar. */
export const PRECARGA_VIGENTE_MS = 15 * 60 * 1000;

export interface EstadoPrecarga {
  clave: string;
  fase: 'guardando' | 'lista' | 'incompleta';
  hechas: number;
  total: number;
}

/**
 * Descarga todo lo de un torneo al elegirlo (con conexión), para tenerlo antes de perder la
 * cobertura. Lo que se descarga se guarda solo, porque pasa por el interceptor de caché.
 */
@Injectable({ providedIn: 'root' })
export class PrecargaService {
  private readonly auth = inject(AuthStore);
  private readonly context = inject(TournamentContext);
  private readonly offline = inject(OfflineState);
  private readonly pwa = inject(PwaService);
  private readonly offlineDb = inject(OfflineDb);
  /** Las precargas de las features y un cliente sin el interceptor de errores (ver fondo.ts). */
  private readonly precargas = injectFuncionesOffline((funciones) => funciones.precargas);

  readonly estado = signal<EstadoPrecarga | null>(null);
  /** Clave → cuándo se guardó. Para marcar en el selector los torneos disponibles sin red. */
  readonly guardados = signal<Record<string, number>>({});
  /** Lo que se está viendo ahora mismo (torneo activo, o «mis pedidos»). */
  readonly claveActual = computed(() => this.clave(this.contexto()));

  private enCurso: string | null = null;

  constructor() {
    // Que estén descargadas mientras hay red: sin red puede no haber forma de traerlas
    void this.precargas().catch(() => undefined);
    effect(() => {
      const contexto = this.contexto();
      const puede = !this.offline.modoSinConexion() && this.pwa.conectado();
      // Cada usuario tiene su base de datos: al cambiar, se leen sus torneos guardados
      void this.auth.userId();
      untracked(() => {
        void this.cargarGuardados();
        if (contexto && puede) void this.guardar(contexto);
      });
    });
  }

  /** Volver a descargarlo aunque esté reciente (el botón «Actualizar copia»). */
  actualizar(): Promise<void> {
    const contexto = this.contexto();
    return contexto ? this.guardar(contexto, true) : Promise.resolve();
  }

  private contexto(): ContextoPrecarga | null {
    const rol = this.auth.role();
    if (!this.auth.isLoggedIn() || !rol) return null;
    // El jugador ve sus pedidos de cualquier torneo: no depende del selector
    if (rol === 'USER') return { tournamentId: null, rol };
    const tournamentId = this.context.selectedId();
    // Sin torneo, solo el ADMIN tiene algo que ver (todo junto)
    return tournamentId || rol === 'ADMIN' ? { tournamentId, rol } : null;
  }

  private clave(contexto: ContextoPrecarga | null): string | null {
    if (!contexto) return null;
    return contexto.tournamentId ?? (contexto.rol === 'USER' ? 'mis-pedidos' : 'todos');
  }

  private async guardar(contexto: ContextoPrecarga, forzar = false): Promise<void> {
    const clave = this.clave(contexto)!;
    const db = await this.offlineDb.db();
    if (!db || this.enCurso === clave) return;
    const anterior = await db.precargas.get(clave).catch(() => undefined);
    if (!forzar && anterior && Date.now() - anterior.guardadoEn < PRECARGA_VIGENTE_MS) {
      this.estado.set({ clave, fase: 'lista', hechas: anterior.hechas, total: anterior.total });
      return;
    }

    const { elementos, injector } = await this.precargas();
    const peticiones = runInInjectionContext(injector, () =>
      elementos.flatMap((precarga) => precarga.peticiones(injector.get(precarga.api), contexto)),
    );
    const total = peticiones.length;
    this.enCurso = clave;
    this.estado.set({ clave, fase: 'guardando', hechas: 0, total });

    let hechas = 0;
    const resultados = await firstValueFrom(
      forkJoin(
        peticiones.map((peticion) =>
          peticion.pipe(
            map(() => {
              hechas++;
              this.estado.update((e) => (e?.clave === clave ? { ...e, hechas } : e));
              return true;
            }),
            // Una que falle no estropea las demás: se cuenta y se sigue
            catchError(() => of(false)),
          ),
        ),
      ),
      { defaultValue: [] as boolean[] },
    );
    this.enCurso = null;

    const ok = resultados.filter(Boolean).length;
    const registro: Precargado = { clave, guardadoEn: Date.now(), hechas: ok, total };
    await db.precargas.put(registro).catch(() => undefined);
    this.guardados.update((g) => ({ ...g, [clave]: registro.guardadoEn }));
    // Si el usuario ya está en otro torneo, no se le pisa su estado
    this.estado.update((e) =>
      e?.clave === clave
        ? { clave, fase: ok === total ? 'lista' : 'incompleta', hechas: ok, total }
        : e,
    );
  }

  private async cargarGuardados(): Promise<void> {
    const db = await this.offlineDb.db();
    if (!db) return this.guardados.set({});
    const lista = await db.precargas.toArray().catch(() => [] as Precargado[]);
    this.guardados.set(Object.fromEntries(lista.map((p) => [p.clave, p.guardadoEn])));
    const actual = this.claveActual();
    const suya = lista.find((p) => p.clave === actual);
    if (suya && !this.estado()) {
      this.estado.set({
        clave: suya.clave,
        fase: suya.hechas === suya.total ? 'lista' : 'incompleta',
        hechas: suya.hechas,
        total: suya.total,
      });
    }
  }
}
