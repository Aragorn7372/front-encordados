import { expect, test } from './soporte/fixtures';
import { sesion } from './soporte/usuarios';

test.use({ storageState: sesion('owner') });

test('campana: avisa de un pedido creado por otro y se marca como leído', async ({
  page,
  datos,
}) => {
  const jugador = await datos.contacto('Campana');
  await page.goto('/pedidos');
  await expect(page.getByText('Reconectando…')).toBeHidden({ timeout: 15_000 });
  const campana = page.getByTestId('campana');
  const lista = page.locator('.dropdown-content').filter({ hasText: 'Notificaciones' });

  // Con la campana abierta, otro usuario (la API) crea un pedido y su aviso aparece en la lista.
  // Si se creó justo antes de que el tiempo real terminara de conectarse, se repite una vez
  await campana.click();
  await datos.pedido(jugador.username);
  try {
    await expect(lista).toContainText(jugador.nombre, { timeout: 10_000 });
  } catch {
    await datos.pedido(jugador.username);
    await expect(lista).toContainText(jugador.nombre, { timeout: 15_000 });
  }

  // El owner recibe los avisos de todos sus torneos y el otro worker crea pedidos a la vez: no se
  // puede esperar un número exacto. Se apunta cada valor de la etiqueta y se comprueba que, al
  // volver a pulsarla, llega a «Notificaciones» (cero sin leer), aunque después entren más
  await expect(campana).toHaveAttribute('aria-label', /sin leer/);
  await campana.evaluate((el) => {
    const w = window as unknown as { etiquetas: (string | null)[] };
    w.etiquetas = [];
    new MutationObserver(() => w.etiquetas.push(el.getAttribute('aria-label'))).observe(el, {
      attributes: true,
      attributeFilter: ['aria-label'],
    });
  });
  await campana.click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { etiquetas: string[] }).etiquetas))
    .toContain('Notificaciones');
});

test('cambios sin enviar: se ven en la barra y se envían al volver la conexión', async ({
  page,
  context,
  datos,
}) => {
  const jugador = await datos.contacto('Cola');
  const pedido = await datos.pedido(jugador.username);
  await page.goto('/pedidos');
  const tarjeta = page.locator('app-linea-card').filter({ hasText: jugador.nombre });
  await expect(tarjeta).toBeVisible();

  await page.getByRole('button', { name: 'Menú de usuario' }).click();
  await page.getByText('Trabajar sin conexión').click();
  await page.locator('main h1').click();
  await context.setOffline(true);

  await tarjeta.getByRole('button', { name: 'Empezar' }).click();
  const cola = page.getByTestId('cambios-pendientes');
  await expect(cola).toBeVisible();
  await cola.click();
  await expect(page.getByText('Se enviarán al recuperar la conexión.')).toBeVisible();

  await context.setOffline(false);
  await page.getByRole('button', { name: 'Sin conexión', exact: true }).click();
  await expect(page.getByTestId('cambios-pendientes')).toHaveCount(0, { timeout: 20_000 });
  await expect
    .poll(async () => {
      const [enServidor] = await datos.api.pedidosDe(datos.torneoId, jugador.username);
      return `${enServidor.id} ${enServidor.lineas[0].status}`;
    })
    .toBe(`${pedido.id} IN_PROGRESS`);
});
