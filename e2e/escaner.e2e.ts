import { Page } from '@playwright/test';
import { expect, test } from './soporte/fixtures';
import { sesion } from './soporte/usuarios';

/*
 * La cámara de verdad no se puede probar aquí (en el CI no hay). Sí todo lo demás: el enlace del
 * QR, escribir el código a mano y leerlo de una foto (la misma imagen que se descarga del pedido).
 */
test.use({ storageState: sesion('owner'), permissions: [] });

/** El detalle del pedido abierto, con el nombre del jugador. */
const detalleAbierto = (page: Page, jugador: string) =>
  expect(page.locator('dialog[open]')).toContainText(jugador);

test('el enlace del QR abre el pedido', async ({ page, datos }) => {
  const jugador = await datos.contacto('QR enlace');
  const pedido = await datos.pedido(jugador.username);

  await page.goto(`/escanear?codigo=${pedido.id}`);
  await expect(page).toHaveURL(new RegExp(`openPedido=${pedido.id}`));
  await detalleAbierto(page, jugador.nombre);
});

test('escribir el código a mano abre el pedido; un texto cualquiera avisa', async ({
  page,
  datos,
}) => {
  const jugador = await datos.contacto('Codigo manual');
  const pedido = await datos.pedido(jugador.username);
  await page.goto('/escanear');

  await page.getByLabel('Código del pedido').fill('esto no es un código');
  await page.getByRole('button', { name: 'Abrir' }).click();
  await expect(page.getByText('no es el código de un pedido')).toBeVisible();

  // Como lo leería un lector de códigos de barras: el id en mayúsculas
  await page.getByLabel('Código del pedido').fill(pedido.id.toUpperCase());
  await page.getByRole('button', { name: 'Abrir' }).click();
  await detalleAbierto(page, jugador.nombre);
});

test('leer los códigos desde una foto abre el pedido', async ({ page, datos }) => {
  const jugador = await datos.contacto('Foto');
  await datos.pedido(jugador.username);

  // La imagen de códigos que se descarga desde la tarjeta del tablero
  await page.goto('/pedidos');
  await page
    .locator('app-linea-card')
    .filter({ hasText: jugador.nombre })
    .getByTestId('codigos')
    .click();
  await expect(page.locator('dialog[open]').getByTestId('codigos-imagen')).toBeVisible();
  const descarga = page.waitForEvent('download');
  await page.locator('dialog[open]').getByRole('button', { name: 'Descargar' }).click();
  const imagen = await (await descarga).path();

  await page.goto('/escanear');
  await page.getByLabel('Foto del código').setInputFiles(imagen);
  await detalleAbierto(page, jugador.nombre);
});
