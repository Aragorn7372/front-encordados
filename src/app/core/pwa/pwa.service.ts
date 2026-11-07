import { DOCUMENT, DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

/** El evento de «instalar» de Chrome/Edge/Android. No está en los tipos del DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Lo que la app necesita saber de la PWA: si hay versión nueva, si hay conexión y si se puede
 * instalar. Sin service worker (desarrollo) solo funciona la parte de la conexión.
 */
@Injectable({ providedIn: 'root' })
export class PwaService {
  /** Opcional: sin provideServiceWorker (tests) la parte de versiones simplemente no está. */
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly doc = inject(DOCUMENT);
  private readonly win = this.doc.defaultView;

  /** El service worker ya tiene descargada una versión nueva: falta recargar. */
  readonly nuevaVersion = signal(false);
  readonly conectado = signal(this.win?.navigator.onLine ?? true);
  readonly instalable = signal(false);

  private aviso: BeforeInstallPromptEvent | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Por nombre: «beforeinstallprompt» y «appinstalled» no están en los tipos del DOM
    const on = (tipo: string, fn: (evento: Event) => void) => {
      this.win?.addEventListener(tipo, fn);
      destroyRef.onDestroy(() => this.win?.removeEventListener(tipo, fn));
    };

    on('online', () => this.conectado.set(true));
    on('offline', () => this.conectado.set(false));

    on('beforeinstallprompt', (evento) => {
      // Se guarda para lanzarlo cuando el usuario lo pida, no cuando le apetezca al navegador
      evento.preventDefault();
      this.aviso = evento as BeforeInstallPromptEvent;
      this.instalable.set(true);
    });
    on('appinstalled', () => {
      this.aviso = null;
      this.instalable.set(false);
    });

    const updates = this.updates;
    if (!updates?.isEnabled) return;

    updates.versionUpdates
      .pipe(
        filter((evento) => evento.type === 'VERSION_READY'),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.nuevaVersion.set(true));

    // La versión guardada ya no se puede servir (borraron sus ficheros): solo vale recargar
    updates.unrecoverable.pipe(takeUntilDestroyed()).subscribe(() => this.win?.location.reload());

    // Al volver a la pestaña se mira si hay versión nueva: sin sondeos con temporizador
    const alVolver = () => {
      if (this.doc.visibilityState === 'visible')
        void updates.checkForUpdate().catch(() => undefined);
    };
    this.doc.addEventListener('visibilitychange', alVolver);
    destroyRef.onDestroy(() => this.doc.removeEventListener('visibilitychange', alVolver));
  }

  /** Activa la versión nueva y recarga para usarla. */
  async actualizar(): Promise<void> {
    if (this.updates?.isEnabled) await this.updates.activateUpdate();
    this.win?.location.reload();
  }

  async instalar(): Promise<void> {
    const aviso = this.aviso;
    if (!aviso) return;
    await aviso.prompt();
    await aviso.userChoice;
    // El aviso solo se puede usar una vez, se acepte o no
    this.aviso = null;
    this.instalable.set(false);
  }
}
