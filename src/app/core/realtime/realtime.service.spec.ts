import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HubConnection } from '@microsoft/signalr';
import { Role } from '../../shared/models/roles';
import { AuthStore } from '../auth/store/auth.store';
import { APP_CONFIG } from '../config/app-config';
import { TournamentNotification } from './realtime.models';
import { HUB_FACTORY, RealtimeService } from './realtime.service';

function fakeHub() {
  const handlers: Record<string, (...args: never[]) => void> = {};
  return {
    handlers,
    start: vi.fn(async (): Promise<void> => undefined),
    stop: vi.fn(async () => undefined),
    on: vi.fn((name: string, handler: () => void) => (handlers[name] = handler)),
    onreconnecting: vi.fn((handler: () => void) => (handlers['reconnecting'] = handler)),
    onreconnected: vi.fn((handler: () => void) => (handlers['reconnected'] = handler)),
    onclose: vi.fn((handler: () => void) => (handlers['close'] = handler)),
  };
}

describe('RealtimeService', () => {
  const token = signal<string | null>(null);
  const role = signal<Role | null>(null);
  let hubs: ReturnType<typeof fakeHub>[];
  let urls: string[];
  let nextStart: (() => Promise<void>) | undefined;

  const setup = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: APP_CONFIG, useValue: { apiUrl: 'https://api.test' } },
        {
          provide: AuthStore,
          useValue: { token, hasRole: (...roles: Role[]) => roles.includes(role()!) },
        },
        {
          provide: HUB_FACTORY,
          useValue: async (url: string) => {
            const hub = fakeHub();
            if (nextStart) hub.start.mockImplementationOnce(nextStart);
            hubs.push(hub);
            urls.push(url);
            return hub as unknown as HubConnection;
          },
        },
      ],
    });
    return TestBed.inject(RealtimeService);
  };

  const login = (userRole: Role = 'OWNER') => {
    role.set(userRole);
    token.set('abc');
    TestBed.tick();
  };

  const settle = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  };

  beforeEach(() => {
    token.set(null);
    role.set(null);
    hubs = [];
    urls = [];
    nextStart = undefined;
  });

  afterEach(() => vi.useRealTimers());

  it('sin sesión no conecta', () => {
    const service = setup();
    TestBed.tick();

    expect(hubs).toHaveLength(0);
    expect(service.status()).toBe('off');
  });

  it('conecta justo al iniciar sesión, sin recargar', async () => {
    const service = setup();
    TestBed.tick();

    login();
    await settle();

    expect(urls).toEqual(['https://api.test/hub/Torneos']);
    expect(service.status()).toBe('on');
  });

  it('USER no conecta, porque el hub lo rechazaría', async () => {
    setup();
    login('USER');
    await settle();

    expect(hubs).toHaveLength(0);
  });

  it('desconecta al cerrar sesión', async () => {
    const service = setup();
    login();
    await settle();

    role.set(null);
    token.set(null);
    TestBed.tick();

    expect(hubs[0].stop).toHaveBeenCalled();
    expect(service.status()).toBe('off');
  });

  it('otro usuario abre una conexión nueva y cierra la anterior', async () => {
    setup();
    login();
    await settle();

    token.set('otro');
    TestBed.tick();

    expect(hubs[0].stop).toHaveBeenCalled();
    expect(hubs).toHaveLength(2);
  });

  it('reenvía los eventos del hub', async () => {
    const service = setup();
    const received: TournamentNotification[] = [];
    service.events$.subscribe((event) => received.push(event));
    login();
    await settle();

    const event = { tipo: 'PEDIDO_CREADO', pedidoId: 'p1' } as TournamentNotification;
    hubs[0].handlers['ReceiveTournamentNotification'](event as never);

    expect(received).toEqual([event]);
  });

  it('informa del corte y avisa al recuperar la conexión', async () => {
    const service = setup();
    let reconnections = 0;
    service.reconnected$.subscribe(() => reconnections++);
    login();
    await settle();

    hubs[0].handlers['reconnecting']();
    expect(service.status()).toBe('connecting');

    hubs[0].handlers['reconnected']();
    expect(service.status()).toBe('on');
    expect(reconnections).toBe(1);
  });

  it('cerrar sesión mientras se descarga SignalR no deja una conexión abierta', async () => {
    setup();
    login();
    token.set(null);
    TestBed.tick();
    await settle();

    expect(hubs[0].start).not.toHaveBeenCalled();
  });

  it('si falla el primer intento, sigue reintentando', async () => {
    vi.useFakeTimers();
    nextStart = () => Promise.reject(new Error('sin red'));
    const service = setup();
    login();
    await settle();
    expect(service.status()).toBe('connecting');

    await vi.advanceTimersByTimeAsync(1000);

    expect(hubs[0].start).toHaveBeenCalledTimes(2);
    expect(service.status()).toBe('on');
  });

  it('cerrar sesión cancela los reintentos pendientes', async () => {
    vi.useFakeTimers();
    nextStart = () => Promise.reject(new Error('sin red'));
    setup();
    login();
    await settle();

    token.set(null);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(hubs[0].start).toHaveBeenCalledTimes(1);
  });
});
