import 'fake-indexeddb/auto';
import {
  HttpClient,
  HttpResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import Dexie from 'dexie';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../auth/store/auth.store';
import { ESPERA_COPIA_MS, cacheInterceptor } from './cache.interceptor';
import { OfflineDb } from './offline-db';
import { OfflineState } from './offline-state';

const URL = '/api/purchased?tournamentId=t1';

describe('cacheInterceptor', () => {
  const usuario = signal<string | null>('u1');
  let http: HttpClient;
  let backend: HttpTestingController;
  let estado: OfflineState;
  let offlineDb: OfflineDb;

  const db = async () => (await offlineDb.db())!;
  /** IndexedDB es asíncrono: la petición sale cuando la base de datos ha contestado. */
  const peticion = async (url = URL): Promise<TestRequest> => {
    // match() saca la petición de las pendientes: se guarda en cuanto aparece
    let encontrada: TestRequest | undefined;
    await vi.waitFor(() => {
      encontrada ??= backend.match(url)[0];
      expect(encontrada).toBeDefined();
    });
    return encontrada!;
  };
  const pedir = (url = URL) => firstValueFrom(http.get(url, { observe: 'response' }));

  beforeEach(async () => {
    usuario.set('u1');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([cacheInterceptor])),
        provideHttpClientTesting(),
        { provide: ESPERA_COPIA_MS, useValue: 50 },
        {
          provide: AuthStore,
          useValue: { isLoggedIn: () => usuario() !== null, userId: usuario },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    estado = TestBed.inject(OfflineState);
    offlineDb = TestBed.inject(OfflineDb);
    TestBed.tick();
    await (await db()).lecturas.clear();
  });

  afterEach(async () => {
    (await offlineDb.db())?.close();
    await Dexie.delete('etr-u1');
  });

  it('con red: responde el servidor y guarda una copia', async () => {
    const respuesta = pedir();
    (await peticion()).flush({ content: [1, 2] });

    expect((await respuesta).body).toEqual({ content: [1, 2] });
    await vi.waitFor(async () => expect(await (await db()).lecturas.get(URL)).toBeDefined());
    expect(estado.sinServidor()).toBe(false);
  });

  it('sin red y con copia: sirve la copia, dice de cuándo es y no falla', async () => {
    await (
      await db()
    ).lecturas.put({ clave: URL, cuerpo: { content: ['guardado'] }, guardadoEn: 1000 });

    const respuesta = pedir();
    (await peticion()).error(new ProgressEvent('error'), { status: 0 });

    const r = (await respuesta) as HttpResponse<unknown>;
    expect(r.body).toEqual({ content: ['guardado'] });
    expect(r.headers.get('X-Etr-Copia')).toBe('1000');
    expect(estado.copiaDel()).toBe(1000);
    expect(estado.sinServidor()).toBe(true);
  });

  it('sin red y sin copia: el error sigue, para que la pantalla diga «necesitas conexión»', async () => {
    const respuesta = pedir();
    (await peticion()).error(new ProgressEvent('error'), { status: 0 });

    await expect(respuesta).rejects.toMatchObject({ status: 0 });
    expect(estado.sinServidor()).toBe(true);
  });

  it('si el servidor contesta con un error, no se tapa con la copia', async () => {
    await (await db()).lecturas.put({ clave: URL, cuerpo: {}, guardadoEn: 1000 });

    const respuesta = pedir();
    (await peticion()).flush({ message: 'Error' }, { status: 500, statusText: 'Error' });

    await expect(respuesta).rejects.toMatchObject({ status: 500 });
  });

  it('con poca cobertura (la red no contesta), a los pocos segundos sirve la copia', async () => {
    await (await db()).lecturas.put({ clave: URL, cuerpo: { lento: true }, guardadoEn: 2000 });

    const respuesta = pedir();
    const pendiente = await peticion();

    expect((await respuesta).body).toEqual({ lento: true });
    // La petición sigue viva: cuando llegue, actualiza la copia para la próxima vez
    expect(pendiente.cancelled).toBe(false);
    pendiente.flush({ lento: false });
    await vi.waitFor(async () =>
      expect((await (await db()).lecturas.get(URL))?.cuerpo).toEqual({ lento: false }),
    );
  });

  it('modo sin conexión elegido: ni se intenta la red', async () => {
    await (await db()).lecturas.put({ clave: URL, cuerpo: { de: 'copia' }, guardadoEn: 3000 });
    estado.modoSinConexion.set(true);

    expect((await pedir()).body).toEqual({ de: 'copia' });
    await expect(pedir('/api/otra')).rejects.toMatchObject({ status: 0 });
    backend.expectNone(URL);
    backend.expectNone('/api/otra');
  });

  it('las escrituras y lo que no es /api no pasan por la caché', async () => {
    firstValueFrom(http.post('/api/purchased', {})).catch(() => undefined);
    backend.expectOne('/api/purchased').flush({});
    firstValueFrom(http.get('/config.json')).catch(() => undefined);
    backend.expectOne('/config.json').flush({});

    expect(await (await db()).lecturas.count()).toBe(0);
  });
});

describe('OfflineDb', () => {
  const usuario = signal<string | null>('u9');
  const auth = {
    isLoggedIn: () => usuario() !== null,
    userId: usuario,
    salidaVoluntaria: true,
  };
  const abrir = async () => {
    TestBed.configureTestingModule({ providers: [{ provide: AuthStore, useValue: auth }] });
    const offlineDb = TestBed.inject(OfflineDb);
    TestBed.tick();
    await (await offlineDb.db())!.lecturas.put({ clave: 'x', cuerpo: 1, guardadoEn: Date.now() });
    return offlineDb;
  };
  const salir = (voluntaria: boolean) => {
    auth.salidaVoluntaria = voluntaria;
    usuario.set(null);
    TestBed.tick();
  };

  beforeEach(() => {
    localStorage.clear();
    usuario.set('u9');
  });
  afterEach(async () => {
    await Dexie.delete('etr-u9');
    await Dexie.delete('etr-u8');
  });

  it('al cerrar sesión borra la base de datos de ese usuario', async () => {
    const offlineDb = await abrir();
    expect(await Dexie.exists('etr-u9')).toBe(true);

    salir(true);

    await vi.waitFor(async () => expect(await Dexie.exists('etr-u9')).toBe(false));
    expect(await offlineDb.db()).toBeNull();
  });

  it('si la sesión caduca la conserva (tiene cambios sin enviar) y la recupera al volver', async () => {
    const offlineDb = await abrir();

    salir(false);
    await new Promise((r) => setTimeout(r, 30));
    expect(await Dexie.exists('etr-u9')).toBe(true);

    usuario.set('u9');
    TestBed.tick();
    expect(await (await offlineDb.db())!.lecturas.get('x')).toBeDefined();
  });

  it('si tras caducar entra otro usuario, lo del anterior se borra', async () => {
    await abrir();
    salir(false);

    usuario.set('u8');
    TestBed.tick();

    await vi.waitFor(async () => expect(await Dexie.exists('etr-u9')).toBe(false));
  });
});
