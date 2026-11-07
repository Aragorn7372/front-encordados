import { Injector, Provider, inject, signal } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { ManejadorOutbox, Operacion, Resultado } from './outbox';
import { OperacionEnviada, OutboxService } from './outbox.service';

/**
 * Para tests de una feature: la cola como si siempre hubiera conexión y nada esperando. Envía
 * en el acto con los manejadores reales de la feature, contra el API que el test haya simulado
 * (`{ provide: XApi, useValue: ... }`). La cola de verdad tiene sus propios tests.
 */
export function provideOutboxDirecto(manejadores: ManejadorOutbox[] = []): Provider {
  return {
    provide: OutboxService,
    useFactory: () => {
      const injector = inject(Injector);
      const porTipo = new Map(manejadores.map((m) => [m.tipo, m]));
      return {
        operaciones: signal<Operacion[]>([]),
        pendientes: signal<Operacion[]>([]),
        fallidas: signal<Operacion[]>([]),
        ids: signal<Record<string, string>>({}),
        enviadas$: new Subject<OperacionEnviada>(),
        sincronizada$: new Subject<void>(),
        async ejecutar<R>(tipo: string, payload: unknown): Promise<Resultado<R>> {
          const manejador = porTipo.get(tipo);
          if (!manejador) throw new Error(`Sin manejador para «${tipo}» en el test`);
          const respuesta = await firstValueFrom(
            manejador.enviar(injector.get(manejador.api), payload),
          );
          return { enviada: true, respuesta: respuesta as R };
        },
      } as unknown as OutboxService;
    },
  };
}
