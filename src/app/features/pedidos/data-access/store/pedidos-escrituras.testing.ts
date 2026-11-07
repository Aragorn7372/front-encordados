import { Provider } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { PedidosEscrituras } from './pedidos-escrituras';

type Fn = (...args: never[]) => Observable<unknown>;

/**
 * Para tests de componentes: escrituras como con conexión y sin cola, contra un PedidosApi
 * falso. La cola tiene sus propios tests (OutboxService, PedidosEscrituras).
 */
export function provideEscriturasDirectas(api: Partial<Record<string, Fn>>): Provider {
  const llamar = (nombre: string, ...args: unknown[]) =>
    firstValueFrom((api[nombre] as (...a: unknown[]) => Observable<unknown>)(...args));
  const escrituras = {
    crear: async (request: unknown) => ({ pedido: await llamar('create', request), enviado: true }),
    editar: (pedido: unknown, cambios: unknown) => llamar('update', pedido, cambios),
    estadoLinea: (...[, linea, estado]: [unknown, { id: string }, unknown]) =>
      llamar('changeLineStatus', linea.id, estado),
    cancelar: (pedido: { id: string }) => llamar('cancel', pedido.id),
    cancelarLinea: (...[, linea]: [unknown, { id: string }]) => llamar('cancelLine', linea.id),
  };
  return { provide: PedidosEscrituras, useValue: escrituras };
}
