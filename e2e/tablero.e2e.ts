import { Page } from '@playwright/test';
import { expect, test } from './soporte/fixtures';
import { USUARIOS, sesion } from './soporte/usuarios';

test.use({ storageState: sesion('owner') });

const columna = (page: Page, nombre: string) =>
  page.locator('app-kanban-column').filter({ has: page.getByRole('heading', { name: nombre }) });
const tarjeta = (page: Page, jugador: string, col?: string) =>
  (col ? columna(page, col) : page).locator('app-linea-card').filter({ hasText: jugador });

test('un pedido nuevo sale en Pendiente y avanza con los botones', async ({ page, datos }) => {
  const jugador = await datos.contacto('Botones');
  const pedido = await datos.pedido(jugador.username);

  await page.goto('/pedidos');
  await expect(tarjeta(page, jugador.nombre, 'Pendiente')).toBeVisible();

  await tarjeta(page, jugador.nombre).getByRole('button', { name: 'Empezar' }).click();
  await expect(tarjeta(page, jugador.nombre, 'En proceso')).toBeVisible();
  await tarjeta(page, jugador.nombre).getByRole('button', { name: 'Marcar listo' }).click();
  await expect(tarjeta(page, jugador.nombre, 'Listo')).toBeVisible();

  // Y queda guardado en el servidor (el listado del back tarda un poco en reflejarlo)
  await expect
    .poll(async () => {
      const [enServidor] = await datos.api.pedidosDe(datos.torneoId, jugador.username);
      return `${enServidor.id} ${enServidor.lineas[0].status}`;
    })
    .toBe(`${pedido.id} COMPLETED`);
});

test('desde el detalle se cambia el estado de una raqueta', async ({ page, datos }) => {
  const jugador = await datos.contacto('Detalle');
  await datos.pedido(jugador.username, ['Pure Aero e2e']);

  await page.goto('/pedidos');
  await tarjeta(page, jugador.nombre)
    .getByRole('button', { name: jugador.nombre, exact: true })
    .click();
  const detalle = page.locator('dialog[open]');
  await expect(detalle).toContainText('Pure Aero e2e');
  await detalle.getByRole('combobox', { name: /Estado de/ }).selectOption({ label: 'Listo' });
  await detalle.getByRole('button', { name: 'Cerrar' }).click();

  await expect(tarjeta(page, jugador.nombre, 'Listo')).toBeVisible();
});

test('crear un pedido desde el formulario', async ({ page, datos }) => {
  const jugador = await datos.contacto('Formulario');

  await page.goto('/pedidos');
  await page.getByRole('button', { name: 'Nuevo pedido' }).click();
  const dialogo = page.locator('dialog[open]');
  await dialogo.locator('#pedido-jugador').selectOption({ label: jugador.nombre });
  await dialogo.locator('#pedido-encordador').selectOption(USUARIOS.encordador.username);
  await dialogo.locator('#linea-raqueta-0').fill('Blade 98 e2e');
  await dialogo.locator('#linea-cuerdav-0').fill('RPM Blast');
  await dialogo.getByRole('button', { name: 'Crear pedido' }).click();
  await expect(dialogo).toBeHidden();

  await expect(tarjeta(page, jugador.nombre, 'Pendiente')).toContainText('Blade 98 e2e');
  const creados = await datos.api.pedidosDe(datos.torneoId, jugador.username);
  expect(creados).toHaveLength(1);
});

test('un pedido creado en otro sitio aparece solo, en tiempo real', async ({ page, datos }) => {
  const jugador = await datos.contacto('Tiempo real');
  await page.goto('/pedidos');
  await expect(columna(page, 'Pendiente')).toBeVisible();
  // Espera a que la conexión del tiempo real esté hecha (sin aviso de «Reconectando…»)
  await expect(page.getByText('Reconectando…')).toBeHidden({ timeout: 15_000 });

  await datos.pedido(jugador.username);

  // Sin recargar la página
  await expect(tarjeta(page, jugador.nombre, 'Pendiente')).toBeVisible({ timeout: 15_000 });
});

test('sin conexión: crear y mover un pedido no lo duplica al volver', async ({
  page,
  context,
  datos,
}) => {
  // Es el bug de ENCUERDATU (crear + editar sin conexión → pedido duplicado al reconectar)
  const jugador = await datos.contacto('Sin conexion');
  await page.goto('/pedidos');
  // La copia sin conexión del torneo (hay dos indicadores: el de la barra y el del móvil)
  await expect(
    page.getByRole('button', { name: /Disponible sin conexión/ }).filter({ visible: true }),
  ).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Menú de usuario' }).click();
  await page.getByText('Trabajar sin conexión').click();
  // El desplegable del usuario sigue abierto mientras tenga el foco: se cierra pulsando fuera
  await page.locator('main h1').click();
  await expect(page.getByRole('button', { name: 'Sin conexión', exact: true })).toBeVisible();
  await context.setOffline(true);

  await page.getByRole('button', { name: 'Nuevo pedido' }).click();
  const dialogo = page.locator('dialog[open]');
  await dialogo.locator('#pedido-jugador').selectOption({ label: jugador.nombre });
  await dialogo.locator('#pedido-encordador').selectOption(USUARIOS.encordador.username);
  await dialogo.locator('#linea-raqueta-0').fill('Offline e2e');
  await dialogo.locator('#linea-cuerdav-0').fill('RPM Blast');
  await dialogo.getByRole('button', { name: 'Crear pedido' }).click();
  await expect(dialogo).toBeHidden();

  const nueva = tarjeta(page, jugador.nombre);
  await expect(nueva.getByTestId('sin-enviar')).toBeVisible();
  await nueva.getByRole('button', { name: 'Empezar' }).click();
  await expect(tarjeta(page, jugador.nombre, 'En proceso')).toBeVisible();

  // Vuelve la red y se vuelve a conectar (la app recarga y envía la cola)
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Sin conexión', exact: true }).click();
  await expect(tarjeta(page, jugador.nombre, 'En proceso')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('sin-enviar')).toHaveCount(0, { timeout: 20_000 });

  // Un solo pedido en el servidor, ya en proceso
  await expect
    .poll(async () => {
      const enServidor = await datos.api.pedidosDe(datos.torneoId, jugador.username);
      return enServidor.map((p) => p.lineas[0].status).join(',');
    })
    .toBe('IN_PROGRESS');
});
