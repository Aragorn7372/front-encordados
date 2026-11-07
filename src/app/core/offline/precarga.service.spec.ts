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
import { Role } from '../../shared/models/roles';
import { AuthStore } from '../auth/store/auth.store';
import { APP_CONFIG } from '../config/app-config';
import { PwaService } from '../pwa/pwa.service';
import { TournamentContext } from '../tournament-context/tournament-context';
import { OfflineDb } from './offline-db';
import { OfflineState } from './offline-state';
import { provideFuncionesOffline } from './funciones-offline';
import { definirPrecarga } from './precarga';
import { PrecargaService } from './precarga.service';

/** Una feature de mentira: pide su lista y, si gestiona, el equipo. */
@Injectable()
class FakeApi {
  private readonly http = inject(HttpClient);
  lista = (t: string | null) => this.http.get(`/api/lista?t=${t}`);
  equipo = (t: string) => this.http.get(`/api/equipo?t=${t}`);
}

describe('PrecargaService', () => {
  const rol = signal<Role | undefined>('OWNER');
  const torneo = signal<string | null>(null);
  const conectado = signal(true);
  const navigate = vi.fn();
  let backend: HttpTestingController;
  let service: PrecargaService;
  let offlineDb: OfflineDb;

  const db = async () => (await offlineDb.db())!;
  /** Las peticiones salen después de leer IndexedDB: se esperan. */
  const peticiones = async (n: number): Promise<TestRequest[]> => {
    const vistas: TestRequest[] = [];
    await vi.waitFor(() => {
      vistas.push(...backend.match(() => true));
      expect(vistas.length).toBe(n);
    });
    return vistas;
  };

  beforeEach(async () => {
    localStorage.clear();
    rol.set('OWNER');
    torneo.set(null);
    conectado.set(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiUrl: '' } },
        {
          provide: AuthStore,
          useValue: {
            isLoggedIn: () => true,
            userId: () => 'u1',
            role: rol,
            token: () => 'tk',
          },
        },
        { provide: TournamentContext, useValue: { selectedId: torneo } },
        { provide: PwaService, useValue: { conectado } },
        { provide: Router, useValue: { navigate } },
        provideFuncionesOffline(async () => ({
          manejadores: [],
          precargas: [
            definirPrecarga({
              api: FakeApi,
              peticiones: (api, { tournamentId, rol }) =>
                rol === 'USER'
                  ? [api.lista(null)]
                  : [api.lista(tournamentId), api.equipo(tournamentId!)],
            }),
          ],
        })),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    offlineDb = TestBed.inject(OfflineDb);
    service = TestBed.inject(PrecargaService);
    TestBed.tick();
    await (await db()).precargas.clear();
    await (await db()).lecturas.clear();
  });

  afterEach(async () => {
    (await offlineDb.db())?.close();
    await Dexie.delete('etr-u1');
  });

  it('al elegir un torneo con red lo descarga entero y lo guarda para usarlo sin conexión', async () => {
    torneo.set('t1');
    TestBed.tick();

    const [lista, equipo] = await peticiones(2);
    expect(lista.request.headers.get('Authorization')).toBe('Bearer tk');
    expect(service.estado()).toMatchObject({ clave: 't1', fase: 'guardando', total: 2 });

    lista.flush({ content: [] });
    equipo.flush([]);

    await vi.waitFor(() => expect(service.estado()?.fase).toBe('lista'));
    expect(service.guardados()['t1']).toBeGreaterThan(0);
    expect(await (await db()).precargas.get('t1')).toMatchObject({ hechas: 2, total: 2 });
    // Las respuestas quedan en la copia, con la misma clave que usará la pantalla
    expect(await (await db()).lecturas.get('/api/lista?t=t1')).toBeDefined();
  });

  it('si una falla, las demás se guardan, queda «incompleta» y no saca al usuario a /403', async () => {
    torneo.set('t1');
    TestBed.tick();

    const [lista, equipo] = await peticiones(2);
    lista.flush({ content: [] });
    equipo.flush('Prohibido', { status: 403, statusText: 'Forbidden' });

    await vi.waitFor(() => expect(service.estado()?.fase).toBe('incompleta'));
    expect(service.estado()).toMatchObject({ hechas: 1, total: 2 });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('si se guardó hace poco no lo vuelve a descargar, salvo que se pida «actualizar»', async () => {
    await (await db()).precargas.put({ clave: 't1', guardadoEn: Date.now(), hechas: 2, total: 2 });

    torneo.set('t1');
    TestBed.tick();
    await vi.waitFor(() => expect(service.estado()?.fase).toBe('lista'));
    backend.expectNone(() => true);

    const actualizando = service.actualizar();
    for (const r of await peticiones(2)) r.flush({});
    await actualizando;
    expect(service.estado()).toMatchObject({ fase: 'lista', hechas: 2 });
  });

  it('en modo «sin conexión», o sin red, no pide nada', async () => {
    TestBed.inject(OfflineState).setModoSinConexion(true);
    torneo.set('t1');
    TestBed.tick();
    await new Promise((r) => setTimeout(r, 20));
    backend.expectNone(() => true);

    // Sin pasar por volverAConectar(), que recarga la página
    TestBed.inject(OfflineState).modoSinConexion.set(false);
    conectado.set(false);
    TestBed.tick();
    await new Promise((r) => setTimeout(r, 20));
    backend.expectNone(() => true);
    expect(service.estado()).toBeNull();
  });

  it('el jugador guarda «mis pedidos» sin necesitar torneo', async () => {
    rol.set('USER');
    TestBed.tick();

    const [lista] = await peticiones(1);
    expect(lista.request.url).toBe('/api/lista?t=null');
    lista.flush({ content: [] });
    await vi.waitFor(() =>
      expect(service.estado()).toMatchObject({ clave: 'mis-pedidos', fase: 'lista' }),
    );
  });

  it('sin torneo, un OWNER no tiene nada que guardar', async () => {
    TestBed.tick();
    await new Promise((r) => setTimeout(r, 20));
    backend.expectNone(() => true);
    expect(service.claveActual()).toBeNull();
  });
});
