import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AuthStore } from '../auth/store/auth.store';
import { OutboxService } from '../offline/outbox.service';
import {
  MAX_NOTIFICACIONES,
  NotificacionesService,
  textoNotificacion,
} from './notificaciones.service';
import { NotificationType, TournamentNotification } from './realtime.models';
import { RealtimeService } from './realtime.service';

const evento = (
  tipo: NotificationType,
  purchased: unknown,
  pedidoId = 'P1',
  extra: Partial<TournamentNotification> = {},
): TournamentNotification => ({
  tipo,
  purchased,
  pedidoId,
  tournamentId: 't1',
  timestamp: new Date().toISOString(),
  ...extra,
});
const pedido = (username = 'ana', lineas = 2) => ({
  player: { username, name: 'Ana Pérez' },
  lineas: Array(lineas).fill({}),
});

describe('textoNotificacion', () => {
  it('dice qué ha pasado en palabras', () => {
    expect(textoNotificacion(evento('PEDIDO_CREADO', pedido()))).toBe(
      'Nuevo pedido de Ana Pérez (2 raquetas)',
    );
    expect(textoNotificacion(evento('PEDIDO_CANCELADO', pedido()))).toBe(
      'Pedido de Ana Pérez cancelado',
    );
    expect(
      textoNotificacion(
        evento('ESTATUS_LINEA_PEDIDO_ACTUALIZADA', { raquetModel: 'Pure Aero', status: 2 }),
      ),
    ).toBe('«Pure Aero»: Listo');
  });
});

describe('NotificacionesService', () => {
  const events$ = new Subject<TournamentNotification>();
  const propias$ = new Subject<unknown>();
  const userId = signal<string | null>('u1');
  let servicio: NotificacionesService;

  const crear = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: RealtimeService, useValue: { events$ } },
        { provide: OutboxService, useValue: { propias$ } },
        { provide: AuthStore, useValue: { userId } },
      ],
    });
    servicio = TestBed.inject(NotificacionesService);
    TestBed.tick();
  };

  beforeEach(() => {
    localStorage.clear();
    userId.set('u1');
    crear();
  });

  it('avisa de lo que cambian los demás, lo más nuevo primero, y cuenta las no leídas', () => {
    events$.next(evento('PEDIDO_CREADO', pedido(), 'P1'));
    events$.next(evento('PEDIDO_CANCELADO', pedido('luis'), 'P2'));

    expect(servicio.lista().map((n) => n.pedidoId)).toEqual(['P2', 'P1']);
    expect(servicio.sinLeer()).toBe(2);

    servicio.marcarLeidas();
    expect(servicio.sinLeer()).toBe(0);
  });

  it('lo que acaba de cambiar uno mismo no se avisa (el hub se lo devuelve)', () => {
    // Mover una raqueta: sale por la cola con el id del pedido y de la línea
    propias$.next({ pedidoId: 'P1', lineaId: 'L1', estado: 'COMPLETED' });
    events$.next(
      evento('ESTATUS_LINEA_PEDIDO_ACTUALIZADA', { raquetModel: 'Aero', status: 2 }, 'P1', {
        lineaId: 'L1',
      }),
    );
    // Crear: el id lo da el servidor, se reconoce por el jugador enviado
    propias$.next({ tempId: 'tmp-1', request: { playerName: 'marta' } });
    events$.next(evento('PEDIDO_CREADO', pedido('marta'), 'P9'));

    expect(servicio.lista()).toHaveLength(0);

    events$.next(evento('PEDIDO_CREADO', pedido('otro'), 'P7'));
    expect(servicio.lista()).toHaveLength(1);
  });

  it('guarda solo las últimas y se conservan al recargar, por usuario', () => {
    for (let i = 0; i < MAX_NOTIFICACIONES + 5; i++)
      events$.next(evento('PEDIDO_CANCELADO', pedido(), `P${i}`));
    expect(servicio.lista()).toHaveLength(MAX_NOTIFICACIONES);

    TestBed.resetTestingModule();
    crear();
    expect(servicio.lista()).toHaveLength(MAX_NOTIFICACIONES);

    userId.set('u2');
    TestBed.tick();
    expect(servicio.lista()).toHaveLength(0);
  });
});
