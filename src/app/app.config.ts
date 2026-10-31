import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { apiInterceptor } from './core/http/api.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { routes } from './app.routes';
import { provideSpanishLocale } from './core/config/i18n/provide-locale';
import { ThemeService } from './core/theme/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideHttpClient(withInterceptors([apiInterceptor, errorInterceptor])),
    provideSpanishLocale(),
    // Un servicio root no existe hasta que alguien lo inyecta: el tema debe aplicarse siempre
    provideAppInitializer(() => void inject(ThemeService)),
  ],
};
