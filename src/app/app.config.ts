import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withNavigationErrorHandler,
  withViewTransitions,
} from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { apiInterceptor } from './core/http/api.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { cacheInterceptor } from './core/offline/cache.interceptor';
import { provideFuncionesOffline } from './core/offline/funciones-offline';
import { OfflineDb } from './core/offline/offline-db';
import { OutboxService } from './core/offline/outbox.service';
import { PrecargaService } from './core/offline/precarga.service';
import { routes } from './app.routes';
import { provideSpanishLocale } from './core/config/i18n/provide-locale';
import { PwaService } from './core/pwa/pwa.service';
import { RealtimeService } from './core/realtime/realtime.service';
import { ThemeService } from './core/theme/theme.service';
import { ToastService } from './core/toast/toast.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      // Sin red y sin service worker, el código de una pantalla puede no estar descargado
      withNavigationErrorHandler(() =>
        inject(ToastService).error('No se ha podido abrir esa pantalla: hace falta conexión.'),
      ),
    ),
    // El de caché, el último: si sirve una copia offline, el de errores ni se entera
    provideHttpClient(withInterceptors([apiInterceptor, errorInterceptor, cacheInterceptor])),
    provideSpanishLocale(),
    // Lo que cada feature hace sin conexión (precarga y cola), en su propio chunk (ENCUERDATU-51)
    provideFuncionesOffline(() => import('./app.offline').then((m) => m.default)),
    // Solo en producción: en desarrollo cachearía el código y no verías tus cambios.
    // Se registra cuando la app ya está estable (o a los 30 s), para no competir con el arranque
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Un servicio root no existe hasta que alguien lo inyecta: estos deben funcionar siempre
    provideAppInitializer(() => {
      inject(ThemeService);
      inject(RealtimeService);
      inject(PwaService);
      inject(OfflineDb);
      inject(PrecargaService);
      inject(OutboxService);
    }),
  ],
};
