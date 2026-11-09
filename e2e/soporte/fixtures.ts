import { test as base, expect } from '@playwright/test';
import { Api, unico } from './api';
import { USUARIOS, torneoPruebas } from './usuarios';

export interface Cuenta {
  username: string;
  password: string;
  email: string;
}

interface Datos {
  /** API como owner (dueño del torneo de pruebas). */
  api: Api;
  torneoId: string;
  /** Crea un contacto con nombre único. */
  contacto(prefijo?: string): Promise<{ username: string; id: string; nombre: string }>;
  /** Crea un pedido para ese jugador, asignado a carlos_encordador. */
  pedido(
    jugador: string,
    raquetas?: string[],
    extra?: { comentarios?: string; payStatus?: string },
  ): Promise<{ id: string; lineas: { id: string }[] }>;
  /** Cuenta de usar y tirar (registrada como cualquiera). */
  cuentaNueva(): Promise<Cuenta>;
}

/**
 * `datos`: crea lo que necesita cada test con nombres únicos, para que los 2 workers no se pisen.
 *
 * No se borra nada al terminar: los e2e corren contra bases de datos temporales, y borrar
 * usuarios en paralelo hace saltar un bug del backend (ENCUERDATU-86: dos borrados en el mismo
 * cuarto de segundo generan el mismo email «deleted_…» → 500). Lo único que se borra es el
 * torneo de la ejecución, al final (limpieza.teardown.ts).
 */
export const test = base.extend<{ datos: Datos }>({
  datos: async ({ request }, use) => {
    const api = await Api.como(request, 'owner');
    const torneoId = torneoPruebas().id;

    await use({
      api,
      torneoId,
      async contacto(prefijo = 'Jugador') {
        const nombre = unico(prefijo);
        const creado = await api.crearContacto(torneoId, nombre);
        return { ...creado, nombre };
      },
      async pedido(jugador, raquetas = ['Raqueta e2e'], extra = {}) {
        const creado = await api.crearPedido({
          tournamentId: torneoId,
          jugador,
          encordador: USUARIOS.encordador.username,
          raquetas,
          ...extra,
        });
        return creado;
      },
      async cuentaNueva() {
        // Solo letras, números y _ (como pide el registro), y corto
        const username = `e2e_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const cuenta = { username, password: 'e2e-clave-123', email: `${username}@example.com` };
        await Api.registrar(request, username, cuenta.password);
        return cuenta;
      },
    });
  },
});

export { expect };
