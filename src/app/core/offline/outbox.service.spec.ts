import 'fake-indexeddb/auto';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Injectable, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import Dexie from 'dexie';
import { map } from 'rxjs';
import { AuthStore } from '../auth/store/auth.store';
import { APP_CONFIG } from '../config/app-config';
import { PwaService } from '../pwa/pwa.service';
import { ToastService } from '../toast/toast.service';
import { OfflineDb } from './offline-db';
import { OfflineState } from './offline-state';
import { provideFuncionesOffline } from './funciones-offline';
import { definirManejador } from './outbox';
import {
  ESPERA_ENVIO_MS,
  NO_SE_SABE,
  OperacionEnviada,
  OutboxService,
  REINTENTOS_MS,
} from './outbox.service';

/** Una feature de mentira: crea cosas (con id temporal) y las marca. */
@Injectable()
class CosasApi {
  private readonly http = inject(HttpClient);
  crear = (nombre: string) => this.http.post<{ id: string }>('/api/cosas', { nombre });
  marcar = (id: string) => this.http.patch<{ id: string }>(`/api/cosas/${id}`, null);
  /** Para comprobar si una creación ya llegó. */
  buscar = (nombre: string) =>
    this.http.get<{ id: string }[]>('/api/cosas/buscar', { params: { nombre } });
  /** No se puede repetir y no hay forma de comprobarlo (como sumar bonos). */
  sumar = (id: string) => this.http.post<unknown>(`/api/cosas/${id}/sumar`, null);
}

interface Crear {
  tempId: string;
  nombre: string;
}

describe('OutboxService', () => {
  const usuario = signal<string | null>('u1');
  const conectado = signal(true);
  const auth = {
    isLoggedIn: () => usuario() !== null,
    userId: usuario,
    token: () => 'tk',
    salidaVoluntaria: false,
    logout: vi.fn(),
  };
  const toast = { error: vi.fn() };
  let backend: HttpTestingController;
  let outbox: OutboxService;
  let offlineDb: OfflineDb;
  let enviadas: OperacionEnviada[];

  /** Las peticiones salen tras leer IndexedDB: se espera a que aparezca. */
  const peticion = async (url: string): Promise<TestRequest> => {
    let encontrada: TestRequest | undefined;
    await vi.waitFor(() => {
      encontrada ??= backend.match(url)[0];
      expect(encontrada).toBeDefined();
    });
    return encontrada!;
  };
  const sinRed = (r: TestRequest) => r.error(new ProgressEvent('error'), { status: 0 });
  const guardadas = async () => (await (await offlineDb.db())!.outbox.toArray()).map((o) => o.tipo);

  beforeEach(async () => {
    usuario.set('u1');
    conectado.set(true);
    auth.salidaVoluntaria = false;
    localStorage.clear();
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiUrl: '' } },
        { provide: AuthStore, useValue: auth },
        { provide: PwaService, useValue: { conectado } },
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ESPERA_ENVIO_MS, useValue: 50 },
        { provide: REINTENTOS_MS, useValue: [30] },
        provideFuncionesOffline(async () => ({
          precargas: [],
          manejadores: [
            definirManejador<CosasApi, Crear, { id: string }>({
              tipo: 'crear',
              api: CosasApi,
              enviar: (api, { nombre }) => api.crear(nombre),
              crea: ({ tempId }) => tempId,
              idsCreados: ({ tempId }, { id }) => ({ [tempId]: id }),
              comprobar: (api, { nombre }, { usados }) =>
                api
                  .buscar(nombre)
                  .pipe(map((cosas) => cosas.find((c) => !usados.has(c.id)) ?? null)),
            }),
            definirManejador<CosasApi, { id: string }, unknown>({
              tipo: 'sumar',
              api: CosasApi,
              enviar: (api, { id }) => api.sumar(id),
            }),
            definirManejador<CosasApi, { id: string }, { id: string }>({
              tipo: 'marcar',
              api: CosasApi,
              enviar: (api, { id }) => api.marcar(id),
              idempotente: true,
            }),
          ],
        })),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    offlineDb = TestBed.inject(OfflineDb);
    outbox = TestBed.inject(OutboxService);
    TestBed.tick();
    await (await offlineDb.db())!.outbox.clear();
    await (await offlineDb.db())!.ids.clear();
    enviadas = [];
    outbox.enviadas$.subscribe((e) => enviadas.push(e));
  });

  afterEach(async () => {
    (await offlineDb.db())?.close();
    await Dexie.delete('etr-u1');
  });

  it('con red y nada en la cola, se envía ya y devuelve la respuesta', async () => {
    const resultado = outbox.ejecutar('marcar', { id: 'c1' }, 'Marcar c1');
    (await peticion('/api/cosas/c1')).flush({ id: 'c1' });

    expect(await resultado).toEqual({ enviada: true, respuesta: { id: 'c1' } });
    expect(outbox.operaciones()).toHaveLength(0);
  });

  it('si no hay red, queda en la cola, guardada en el dispositivo', async () => {
    const resultado = outbox.ejecutar('marcar', { id: 'c1' }, 'Marcar c1');
    sinRed(await peticion('/api/cosas/c1'));

    expect(await resultado).toEqual({ enviada: false });
    expect(outbox.pendientes().map((o) => o.descripcion)).toEqual(['Marcar c1']);
    expect(await guardadas()).toEqual(['marcar']);
    expect(TestBed.inject(OfflineState).sinServidor()).toBe(true);
  });

  it('si la red no contesta, lo que se puede repetir va a la cola sin esperar más', async () => {
    const resultado = outbox.ejecutar('marcar', { id: 'c1' }, 'Marcar c1');
    const colgada = await peticion('/api/cosas/c1');

    expect(await resultado).toEqual({ enviada: false });
    expect(colgada.cancelled).toBe(true);
  });

  it('en modo «sin conexión» ni lo intenta', async () => {
    TestBed.inject(OfflineState).setModoSinConexion(true);

    expect(await outbox.ejecutar('marcar', { id: 'c1' }, 'Marcar c1')).toEqual({ enviada: false });
    backend.expectNone(() => true);
  });

  it('un error del servidor no se encola: se lanza, para que el formulario lo pinte', async () => {
    const resultado = outbox.ejecutar('crear', { tempId: 'tmp-1', nombre: '' }, 'Crear', {
      avisarError: true,
    });
    (await peticion('/api/cosas')).flush('El nombre es obligatorio', {
      status: 400,
      statusText: 'Bad Request',
    });

    await expect(resultado).rejects.toMatchObject({
      status: 400,
      message: 'El nombre es obligatorio',
    });
    expect(toast.error).toHaveBeenCalledWith('El nombre es obligatorio');
    expect(outbox.operaciones()).toHaveLength(0);
  });

  it('al volver la red envía en orden y cambia el id temporal por el real', async () => {
    conectado.set(false);
    await outbox.ejecutar('crear', { tempId: 'tmp-1', nombre: 'Uno' }, 'Crear uno');
    await outbox.ejecutar('marcar', { id: 'tmp-1' }, 'Marcar uno');
    backend.expectNone(() => true);

    conectado.set(true);
    TestBed.tick();
    (await peticion('/api/cosas')).flush({ id: 'real-1' });
    // La segunda ya usa el id que ha dado el servidor
    (await peticion('/api/cosas/real-1')).flush({ id: 'real-1' });

    await vi.waitFor(() => expect(outbox.operaciones()).toHaveLength(0));
    expect(enviadas.map((e) => e.operacion.payload)).toEqual([
      { tempId: 'tmp-1', nombre: 'Uno' },
      { id: 'real-1' },
    ]);
    expect(await guardadas()).toEqual([]);
  });

  it('mientras haya algo esperando, lo nuevo va detrás aunque haya red: no lo adelanta', async () => {
    conectado.set(false);
    await outbox.ejecutar('marcar', { id: 'c1' }, 'Marcar c1');
    conectado.set(true);

    const segunda = outbox.ejecutar('marcar', { id: 'c2' }, 'Marcar c2');
    TestBed.tick();
    (await peticion('/api/cosas/c1')).flush({ id: 'c1' });
    (await peticion('/api/cosas/c2')).flush({ id: 'c2' });

    expect(await segunda).toEqual({ enviada: false });
    await vi.waitFor(() =>
      expect(enviadas.map((e) => e.respuesta)).toEqual([{ id: 'c1' }, { id: 'c2' }]),
    );
  });

  it('si el servidor rechaza uno, queda «fallida» con el motivo y sigue con el resto', async () => {
    conectado.set(false);
    await outbox.ejecutar('marcar', { id: 'c1' }, 'Marcar c1');
    await outbox.ejecutar('marcar', { id: 'c2' }, 'Marcar c2');

    conectado.set(true);
    TestBed.tick();
    (await peticion('/api/cosas/c1')).flush('No existe', { status: 404, statusText: 'Not Found' });
    (await peticion('/api/cosas/c2')).flush({ id: 'c2' });

    await vi.waitFor(() => expect(outbox.pendientes()).toHaveLength(0));
    expect(outbox.fallidas().map((o) => [o.descripcion, o.error])).toEqual([
      ['Marcar c1', 'No existe'],
    ]);

    const reintento = outbox.reintentar(outbox.fallidas()[0]);
    (await peticion('/api/cosas/c1')).flush({ id: 'c1' });
    await reintento;
    expect(outbox.operaciones()).toHaveLength(0);
  });

  it('si falla una creación, lo que depende de ella no se envía, y descartarla lo quita todo', async () => {
    conectado.set(false);
    await outbox.ejecutar('crear', { tempId: 'tmp-1', nombre: 'Uno' }, 'Crear uno');
    await outbox.ejecutar('marcar', { id: 'tmp-1' }, 'Marcar uno');

    conectado.set(true);
    TestBed.tick();
    (await peticion('/api/cosas')).flush('Duplicado', { status: 409, statusText: 'Conflict' });

    await vi.waitFor(() => expect(outbox.fallidas()).toHaveLength(2));
    expect(outbox.fallidas()[1].error).toContain('Depende de otro cambio');
    backend.expectNone('/api/cosas/tmp-1');

    await outbox.descartar(outbox.fallidas()[0]);
    expect(outbox.operaciones()).toHaveLength(0);
  });

  it('cancelar algo creado sin conexión y aún sin enviar es no enviarlo', async () => {
    conectado.set(false);
    await outbox.ejecutar('crear', { tempId: 'tmp-1', nombre: 'Uno' }, 'Crear uno');
    await outbox.ejecutar('marcar', { id: 'tmp-1' }, 'Marcar uno');

    expect(await outbox.descartarCreacion('tmp-1')).toBe(true);
    expect(outbox.operaciones()).toHaveLength(0);
  });

  it('si al enviar se vuelve a ir la red, para, lo deja pendiente y lo reintenta solo', async () => {
    conectado.set(false);
    await outbox.ejecutar('marcar', { id: 'c1' }, 'Marcar c1');

    conectado.set(true);
    TestBed.tick();
    sinRed(await peticion('/api/cosas/c1'));
    expect(outbox.pendientes()).toHaveLength(1);

    // Reintento programado (aquí 30 ms)
    (await peticion('/api/cosas/c1')).flush({ id: 'c1' });
    await vi.waitFor(() => expect(outbox.operaciones()).toHaveLength(0));
  });

  it('si la sesión caduca, la cola se conserva y sale al volver a entrar', async () => {
    conectado.set(false);
    await outbox.ejecutar('marcar', { id: 'c1' }, 'Marcar c1');

    auth.salidaVoluntaria = false;
    usuario.set(null);
    TestBed.tick();
    await vi.waitFor(() => expect(outbox.operaciones()).toHaveLength(0));

    conectado.set(true);
    usuario.set('u1');
    TestBed.tick();
    (await peticion('/api/cosas/c1')).flush({ id: 'c1' });

    await vi.waitFor(() => expect(enviadas).toHaveLength(1));
  });

  it('un 401 al enviar ya (sesión caducada) guarda el cambio y cierra la sesión', async () => {
    const resultado = outbox.ejecutar('marcar', { id: 'c1' }, 'Marcar c1');
    (await peticion('/api/cosas/c1')).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(await resultado).toEqual({ enviada: false });
    expect(outbox.pendientes()).toHaveLength(1);
    expect(auth.logout).toHaveBeenCalled();
  });

  it('al volver la red envía aunque la última lectura fallara (nadie más lo va a comprobar)', async () => {
    conectado.set(false);
    TestBed.inject(OfflineState).sinRed();
    await outbox.ejecutar('marcar', { id: 'c1' }, 'Marcar c1');

    conectado.set(true);
    TestBed.tick();

    (await peticion('/api/cosas/c1')).flush({ id: 'c1' });
    await vi.waitFor(() => expect(outbox.operaciones()).toHaveLength(0));
  });

  it('aunque varios avisos pidan sincronizar a la vez, cada cambio se envía una sola vez', async () => {
    conectado.set(false);
    await outbox.ejecutar('crear', { tempId: 'tmp-1', nombre: 'Uno' }, 'Crear uno');
    await outbox.ejecutar('marcar', { id: 'tmp-1' }, 'Marcar uno');

    // Vuelve la red: la piden el aviso de red, el del servidor y una recarga, todo a la vez
    conectado.set(true);
    void outbox.sincronizar();
    void outbox.sincronizar();
    TestBed.tick();

    (await peticion('/api/cosas')).flush({ id: 'real-1' });
    (await peticion('/api/cosas/real-1')).flush({ id: 'real-1' });
    await vi.waitFor(() => expect(outbox.operaciones()).toHaveLength(0));

    backend.expectNone('/api/cosas');
    expect(enviadas).toHaveLength(2);
  });

  describe('no duplica lo que no se puede repetir (ENCUERDATU-51)', () => {
    const db = async () => (await offlineDb.db())!;
    /** Una creación que salió hacia el servidor y la app se cerró o recargó sin respuesta. */
    const interrumpida = async () => {
      await (
        await db()
      ).outbox.add({
        tipo: 'crear',
        payload: { tempId: 'tmp-1', nombre: 'Uno' },
        descripcion: 'Crear uno',
        creadaEn: Date.now() - 5000,
        estado: 'pendiente',
        intentos: 0,
        enviadaEn: Date.now() - 3000,
      });
      // Como al abrir la app: lee la cola guardada
      usuario.set(null);
      TestBed.tick();
      usuario.set('u1');
      TestBed.tick();
    };

    it('antes de enviar una creación se apunta que ha salido (por si la app se cierra a medias)', async () => {
      const resultado = outbox.ejecutar('crear', { tempId: 'tmp-1', nombre: 'Uno' }, 'Crear uno');
      conectado.set(false);
      void resultado;
      await vi.waitFor(async () => expect(await guardadas()).toEqual(['crear']));
      conectado.set(true);
      TestBed.tick();
      const post = await peticion('/api/cosas');

      expect((await (await db()).outbox.toArray())[0]?.enviadaEn).toBeGreaterThan(0);
      post.flush({ id: 'real-1' });
      await vi.waitFor(() => expect(outbox.operaciones()).toHaveLength(0));
    });

    it('si una creación interrumpida ya llegó, se adopta lo creado y NO se crea otra vez', async () => {
      await interrumpida();

      (await peticion('/api/cosas/buscar?nombre=Uno')).flush([{ id: 'real-1' }]);

      await vi.waitFor(() => expect(outbox.operaciones()).toHaveLength(0));
      backend.expectNone('/api/cosas');
      expect(outbox.ids()['tmp-1'] ?? 'real-1').toBe('real-1');
      expect(enviadas.map((e) => e.respuesta)).toEqual([{ id: 'real-1' }]);
    });

    it('si no llegó, entonces sí se envía', async () => {
      await interrumpida();

      (await peticion('/api/cosas/buscar?nombre=Uno')).flush([]);
      (await peticion('/api/cosas')).flush({ id: 'real-1' });

      await vi.waitFor(() => expect(outbox.operaciones()).toHaveLength(0));
    });

    it('si la red se corta a medias al crear, la próxima vez comprueba antes de repetir', async () => {
      const resultado = outbox.ejecutar('crear', { tempId: 'tmp-1', nombre: 'Uno' }, 'Crear uno');
      sinRed(await peticion('/api/cosas'));
      expect(await resultado).toEqual({ enviada: false });

      // Reintento programado: primero mira si llegó (aquí sí)
      (await peticion('/api/cosas/buscar?nombre=Uno')).flush([{ id: 'real-1' }]);

      await vi.waitFor(() => expect(outbox.operaciones()).toHaveLength(0));
      backend.expectNone('/api/cosas');
    });

    it('lo que no se puede repetir ni comprobar (sumar bonos) no se reenvía a ciegas', async () => {
      await (
        await db()
      ).outbox.add({
        tipo: 'sumar',
        payload: { id: 'c1' },
        descripcion: 'Sumar a c1',
        creadaEn: Date.now(),
        estado: 'pendiente',
        intentos: 0,
        enviadaEn: Date.now(),
      });
      usuario.set(null);
      TestBed.tick();
      usuario.set('u1');
      TestBed.tick();

      await vi.waitFor(() => expect(outbox.fallidas()).toHaveLength(1));
      expect(outbox.fallidas()[0].error).toBe(NO_SE_SABE);
      backend.expectNone('/api/cosas/c1/sumar');
    });

    it('si otra pestaña ya envió la cola, esta no la repite (relee la cola guardada)', async () => {
      conectado.set(false);
      await outbox.ejecutar('marcar', { id: 'c1' }, 'Marcar c1');
      // La otra pestaña la envió y la quitó de IndexedDB; aquí sigue en memoria
      await (await db()).outbox.clear();

      conectado.set(true);
      TestBed.tick();
      await new Promise((r) => setTimeout(r, 50));

      backend.expectNone('/api/cosas/c1');
      expect(outbox.operaciones()).toHaveLength(0);
    });
  });
});
