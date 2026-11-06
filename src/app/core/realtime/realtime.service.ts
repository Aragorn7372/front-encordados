import { Injectable, InjectionToken, effect, inject, signal } from '@angular/core';
import type { HubConnection } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { AuthStore } from '../auth/store/auth.store';
import { APP_CONFIG } from '../config/app-config';
import { RealtimeStatus, TournamentNotification } from './realtime.models';

const MAX_RETRY_MS = 30_000;

/** Reintentos sin límite: en un torneo con mala wifi la conexión debe volver sola. */
const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, MAX_RETRY_MS);

export type HubFactory = (url: string, token: () => string) => Promise<HubConnection>;

/**
 * Permite sustituir la conexión real en los tests. SignalR se carga al conectar, no con la app:
 * quien solo ve sus pedidos (USER) nunca lo descarga.
 */
export const HUB_FACTORY = new InjectionToken<HubFactory>('HUB_FACTORY', {
  providedIn: 'root',
  factory: () => async (url, token) => {
    const { HubConnectionBuilder, LogLevel } = await import('@microsoft/signalr');
    return new HubConnectionBuilder()
      .withUrl(url, { accessTokenFactory: token })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: ({ previousRetryCount }) => retryDelay(previousRetryCount),
      })
      .configureLogging(LogLevel.Error)
      .build();
  },
});

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthStore);
  private readonly config = inject(APP_CONFIG);
  private readonly createHub = inject(HUB_FACTORY);

  private readonly notifications = new Subject<TournamentNotification>();
  private readonly reconnections = new Subject<void>();

  readonly events$ = this.notifications.asObservable();
  /** Mientras no había conexión se han podido perder eventos: hay que volver a cargar. */
  readonly reconnected$ = this.reconnections.asObservable();
  readonly status = signal<RealtimeStatus>('off');

  constructor() {
    // Reacciona a la sesión: conecta al entrar y corta al salir, sin que nadie deba pedirlo
    effect((onCleanup) => {
      const token = this.auth.token();
      if (!token || this.auth.hasRole('USER')) return; // El hub no admite a USER

      let stopped = false;
      let retry: ReturnType<typeof setTimeout> | undefined;
      let hub: HubConnection | undefined;

      void this.createHub(`${this.config.apiUrl}/hub/Torneos`, () => token).then((created) => {
        if (stopped) return; // La sesión terminó mientras se descargaba SignalR
        hub = created;
        this.listen(
          created,
          () => stopped,
          (next) => (retry = next),
        );
      });

      onCleanup(() => {
        stopped = true;
        clearTimeout(retry);
        this.status.set('off');
        void hub?.stop();
      });
    });
  }

  private listen(
    hub: HubConnection,
    stopped: () => boolean,
    scheduleRetry: (timer: ReturnType<typeof setTimeout>) => void,
  ): void {
    {
      hub.on('ReceiveTournamentNotification', (event: TournamentNotification) =>
        this.notifications.next(event),
      );
      hub.onreconnecting(() => this.status.set('connecting'));
      hub.onreconnected(() => {
        this.status.set('on');
        this.reconnections.next();
      });
      hub.onclose(() => {
        if (!stopped()) this.status.set('off');
      });

      // withAutomaticReconnect solo cubre conexiones ya establecidas, no el primer intento
      const start = (attempt: number) => {
        this.status.set('connecting');
        hub.start().then(
          () => {
            if (stopped()) return;
            this.status.set('on');
            if (attempt > 0) this.reconnections.next();
          },
          () => {
            if (!stopped()) {
              scheduleRetry(setTimeout(() => start(attempt + 1), retryDelay(attempt)));
            }
          },
        );
      };
      start(0);
    }
  }
}
