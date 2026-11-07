import {
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpHeaders,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { esSinServidor } from '../http/app-error';
import {
  Observable,
  catchError,
  defer,
  filter,
  from,
  map,
  of,
  race,
  share,
  switchMap,
  tap,
  throwError,
  timer,
} from 'rxjs';
import type { EtrDb } from './etr-db';
import { Lectura, OfflineDb } from './offline-db';
import { OfflineState } from './offline-state';

/** Para peticiones que nunca deben servirse de una copia (por ejemplo, comprobar algo en vivo). */
export const SIN_COPIA = new HttpContextToken<boolean>(() => false);

/** Con copia guardada, no se espera más que esto: con poca cobertura la red cuelga, no falla. */
export const ESPERA_COPIA_MS = new InjectionToken<number>('ESPERA_COPIA_MS', {
  factory: () => 6000,
});

/** El servidor no está: sin red, o el proxy no llega al backend. */
export function esFalloDeRed(error: unknown): boolean {
  return error instanceof HttpErrorResponse && esSinServidor(error.status);
}

/**
 * Modo sin conexión elegido por el usuario: ni se intenta la red. Sin copia, el mismo error
 * que daría quedarse sin red, para que la pantalla diga «necesitas conexión».
 */
function soloCopia(db: EtrDb, clave: string, estado: OfflineState): Observable<HttpEvent<unknown>> {
  return from(db.lecturas.get(clave).catch(() => undefined)).pipe(
    switchMap((lectura) => {
      if (lectura) {
        estado.servidaCopia(lectura.guardadoEn);
        return of(respuestaDe(lectura));
      }
      return throwError(
        () => new HttpErrorResponse({ status: 0, statusText: 'Modo sin conexión', url: clave }),
      );
    }),
  );
}

/** La respuesta guardada, como si viniera del servidor. La cabecera dice de cuándo es. */
function respuestaDe(lectura: Lectura): HttpResponse<unknown> {
  return new HttpResponse({
    body: lectura.cuerpo,
    status: 200,
    url: lectura.clave,
    headers: new HttpHeaders({ 'X-Etr-Copia': String(lectura.guardadoEn) }),
  });
}

/**
 * Lecturas para el modo offline: primero la red y, si falla o tarda más de 6 s, la copia
 * guardada. Una sola emisión por petición (el antiguo emitía la copia y luego la red).
 * Cada respuesta buena se guarda en IndexedDB, una base de datos por usuario.
 * Solo GET JSON de /api: escribir sin red es cosa de la cola (outbox), no de este interceptor.
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (
    req.method !== 'GET' ||
    req.responseType !== 'json' ||
    !req.url.includes('/api/') ||
    req.context.get(SIN_COPIA)
  ) {
    return next(req);
  }

  const offlineDb = inject(OfflineDb);
  const estado = inject(OfflineState);
  const espera = inject(ESPERA_COPIA_MS);
  return defer(() => from(offlineDb.db())).pipe(
    switchMap((db) =>
      db ? conCache(db, req.urlWithParams, next(req), estado, espera) : next(req),
    ),
  );
};

/** Lo de arriba con la base de datos ya abierta (Dexie se carga bajo demanda). */
function conCache(
  db: EtrDb,
  clave: string,
  peticion$: Observable<HttpEvent<unknown>>,
  estado: OfflineState,
  espera: number,
): Observable<HttpEvent<unknown>> {
  if (estado.modoSinConexion()) return soloCopia(db, clave, estado);
  let copiaServida = false;

  // Compartida: si gana la copia, la petición sigue y actualiza la caché para la próxima vez
  const red$ = peticion$.pipe(
    tap((evento) => {
      if (!(evento instanceof HttpResponse)) return;
      if (!copiaServida) estado.conectado();
      void db.lecturas
        .put({ clave, cuerpo: evento.body, guardadoEn: Date.now() })
        .catch(() => undefined);
    }),
    share(),
  );

  const conCopia = (lectura: Lectura): Observable<HttpEvent<unknown>> => {
    const servir = () => {
      copiaServida = true;
      estado.servidaCopia(lectura.guardadoEn);
      return respuestaDe(lectura);
    };
    // La petición va en segundo plano: que acabe aunque ya se haya enseñado la copia
    red$.subscribe({ error: () => undefined });
    return race(
      red$.pipe(
        filter((evento) => evento instanceof HttpResponse),
        catchError((error) => (esFalloDeRed(error) ? of(servir()) : throwError(() => error))),
      ),
      timer(espera).pipe(map(servir)),
    );
  };

  const sinCopia = () =>
    red$.pipe(
      catchError((error) => {
        if (esFalloDeRed(error)) estado.sinRed();
        return throwError(() => error);
      }),
    );

  return from(db.lecturas.get(clave).catch(() => undefined)).pipe(
    switchMap((lectura) => (lectura ? conCopia(lectura) : sinCopia())),
  );
}
