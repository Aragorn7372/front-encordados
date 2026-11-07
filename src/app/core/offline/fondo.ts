import { HttpBackend, provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentInjector, Type, createEnvironmentInjector, inject } from '@angular/core';
import { apiInterceptor } from '../http/api.interceptor';
import { cacheInterceptor } from './cache.interceptor';

/**
 * Un inyector con un HttpClient propio, sin el interceptor de errores, para lo que se hace en
 * segundo plano (precarga, enviar la cola): un fallo ahí no debe llenar la pantalla de toasts
 * ni mandar al usuario a /403. Los clientes de las features se crean aquí de nuevo para que lo
 * usen. El backend (fetch) es el de la app: provideHttpClient traería otro.
 * Se llama en un contexto de inyección.
 */
export function crearInyectorDeFondo(apis: Type<unknown>[]): EnvironmentInjector {
  return createEnvironmentInjector(
    [
      provideHttpClient(withInterceptors([apiInterceptor, cacheInterceptor])),
      { provide: HttpBackend, useValue: inject(HttpBackend) },
      ...apis,
    ],
    inject(EnvironmentInjector),
  );
}
