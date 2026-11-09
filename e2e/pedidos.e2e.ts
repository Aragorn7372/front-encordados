import fs from 'node:fs';
import { Page } from '@playwright/test';
import { expect, test } from './soporte/fixtures';
import { USUARIOS, sesion } from './soporte/usuarios';

test.use({ storageState: sesion('owner') });

const columna = (page: Page, nombre: string) =>
  page.locator('app-kanban-column').filter({ has: page.getByRole('heading', { name: nombre }) });
const tarjetas = (page: Page, jugador: string) =>
  page.locator('app-linea-card').filter({ hasText: jugador });
const dialogo = (page: Page) => page.locator('dialog[open]').last();

/** Abre «Nuevo pedido» con el jugador y el encordador ya elegidos. */
async function nuevoPedido(page: Page, jugador: string) {
  await page.getByRole('button', { name: 'Nuevo pedido' }).click();
  await dialogo(page).locator('#pedido-jugador').selectOption({ label: jugador });
  await dialogo(page).locator('#pedido-encordador').selectOption(USUARIOS.encordador.username);
}

test('cancelar una raqueta pide confirmación y la lleva a cerrados', async ({ page, datos }) => {
  const jugador = await datos.contacto('Cancelar');
  await datos.pedido(jugador.username, ['Raqueta A', 'Raqueta B']);
  await page.goto('/pedidos');

  const primera = tarjetas(page, jugador.nombre).filter({ hasText: 'Raqueta A' });
  await primera.getByTestId('cancelar').click();
  await expect(page.getByRole('heading', { name: 'Cancelar raqueta' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar raqueta', exact: true }).click();

  const cerrados = columna(page, 'Entregado o cancelado');
  await expect(
    cerrados.locator('app-linea-card').filter({ hasText: jugador.nombre }).filter({
      hasText: 'Raqueta A',
    }),
  ).toContainText('Cancelado');
  // La otra raqueta del pedido sigue en Pendiente
  await expect(
    columna(page, 'Pendiente')
      .locator('app-linea-card')
      .filter({ hasText: jugador.nombre })
      .filter({ hasText: 'Raqueta B' }),
  ).toBeVisible();
});

test('cancelar el pedido entero desde el detalle', async ({ page, datos }) => {
  const jugador = await datos.contacto('Cancelar todo');
  await datos.pedido(jugador.username, ['Raqueta A', 'Raqueta B']);
  await page.goto('/pedidos');

  await tarjetas(page, jugador.nombre)
    .first()
    .getByRole('button', { name: jugador.nombre, exact: true })
    .click();
  await dialogo(page).getByRole('button', { name: 'Cancelar pedido' }).click();
  // La confirmación es el diálogo con el título «Cancelar pedido» (el detalle sigue abierto debajo)
  await page
    .locator('dialog[open]')
    .filter({ has: page.getByRole('heading', { name: 'Cancelar pedido' }) })
    .getByRole('button', { name: 'Cancelar pedido' })
    .click();
  await expect(page.getByText('Cancelar pedido', { exact: true })).toBeHidden();
  await page.keyboard.press('Escape');

  await expect(
    columna(page, 'Entregado o cancelado').locator('app-linea-card').filter({
      hasText: jugador.nombre,
    }),
  ).toHaveCount(2);
});

test('repetir un pedido abre el formulario con sus datos', async ({ page, datos }) => {
  const jugador = await datos.contacto('Repetir');
  await datos.pedido(jugador.username, ['Speed Pro e2e']);
  await page.goto('/pedidos');

  await tarjetas(page, jugador.nombre).getByTestId('repetir').click();
  await expect(dialogo(page).getByRole('heading', { name: 'Repetir pedido' })).toBeVisible();
  await expect(dialogo(page).locator('#pedido-jugador')).toHaveValue(jugador.username);
  await expect(dialogo(page).locator('#linea-raqueta-0')).toHaveValue('Speed Pro e2e');
  await dialogo(page).getByRole('button', { name: 'Crear pedido' }).click();
  await expect(dialogo(page)).toBeHidden();

  await expect(tarjetas(page, jugador.nombre)).toHaveCount(2);
});

test('pedido de taller: artículos en vez de raquetas', async ({ page, datos }) => {
  const jugador = await datos.contacto('Taller');
  await page.goto('/pedidos');
  await page.getByRole('button', { name: 'Nuevo pedido' }).click();
  await dialogo(page).getByRole('tab', { name: 'Taller' }).click();
  await dialogo(page).locator('#pedido-jugador').selectOption({ label: jugador.nombre });
  await dialogo(page).locator('#pedido-encordador').selectOption(USUARIOS.encordador.username);
  await dialogo(page).locator('#articulo-nombre-0').fill('Overgrip e2e');
  await dialogo(page).locator('#articulo-cantidad-0').fill('3');
  await dialogo(page).getByRole('button', { name: 'Crear pedido' }).click();
  await expect(dialogo(page)).toBeHidden();

  const tarjeta = tarjetas(page, jugador.nombre);
  await expect(tarjeta).toContainText('Overgrip e2e');
  await expect(tarjeta).toContainText('Taller');
});

test('material propio, varias unidades y horizontal distinta', async ({ page, datos }) => {
  const jugador = await datos.contacto('Opciones');
  await page.goto('/pedidos');
  await nuevoPedido(page, jugador.nombre);
  const d = dialogo(page);
  await d.getByText('El jugador trae su propia cuerda').click();
  await d.locator('#linea-raqueta-0').fill('Ezone e2e');
  await d.locator('#linea-cuerdav-0').fill('Poly Tour');
  await d.locator('#linea-tensionv-0').fill('24');
  await d.getByRole('button', { name: /Una raqueta más/ }).click();
  await d.getByRole('button', { name: /Una raqueta más/ }).click();
  await expect(d.locator('#linea-cantidad-0')).toHaveValue('3');
  await d.getByText('Horizontal distinta').click();
  await expect(d.locator('#linea-cuerdah-0')).toHaveValue('Poly Tour');
  await d.locator('#linea-tensionh-0').fill('23');
  await d.getByRole('button', { name: 'Crear pedido' }).click();
  await expect(d).toBeHidden();

  // Tres raquetas iguales: tres tarjetas numeradas, con material propio y cordaje híbrido
  const creadas = tarjetas(page, jugador.nombre);
  await expect(creadas).toHaveCount(3);
  await expect(creadas.first()).toContainText('Material propio');
  await expect(creadas.first()).toContainText('V: Poly Tour 24 kg');
  await expect(creadas.first()).toContainText('H: Poly Tour 23 kg');
  await expect(creadas.getByTestId('numero').first()).toHaveText(/\/3/);
});

test('lo del pago en los comentarios se ve en la tarjeta, con euros bien escritos', async ({
  page,
  datos,
}) => {
  const jugador = await datos.contacto('Pago');
  // Así lo escribe el backend hoy (ENCUERDATU-81)
  await datos.pedido(jugador.username, ['Raqueta e2e'], {
    comentarios: 'Tensar suave | Falta por pagar: ¤80.00',
  });
  await page.goto('/pedidos');

  const nota = tarjetas(page, jugador.nombre).getByTestId('nota-pago');
  await expect(nota).toHaveText(/Falta por pagar: 80,00\s€/);
  await expect(tarjetas(page, jugador.nombre)).not.toContainText('Tensar suave');
});

test('códigos de una raqueta: la imagen se descarga y se puede imprimir', async ({
  page,
  datos,
}) => {
  const jugador = await datos.contacto('Codigos');
  await datos.pedido(jugador.username);
  await page.goto('/pedidos');

  await tarjetas(page, jugador.nombre).getByTestId('codigos').click();
  await expect(dialogo(page).getByTestId('codigos-imagen')).toBeVisible();

  const descarga = page.waitForEvent('download');
  await dialogo(page).getByRole('button', { name: 'Descargar' }).click();
  const fichero = await descarga;
  expect(fichero.suggestedFilename()).toMatch(/^codigos-.*\.png$/);
  const bytes = fs.readFileSync(await fichero.path());
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');

  // Imprimir: se cambia window.print por un contador para no abrir el diálogo del sistema
  await page.evaluate(() => {
    (window as unknown as { impresiones: number }).impresiones = 0;
    window.print = () => {
      (window as unknown as { impresiones: number }).impresiones++;
    };
  });
  await dialogo(page).getByRole('button', { name: 'Imprimir' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { impresiones: number }).impresiones))
    .toBe(1);
});

test('el buscador filtra el tablero', async ({ page, datos }) => {
  const uno = await datos.contacto('Buscar uno');
  const otro = await datos.contacto('Buscar otro');
  await datos.pedido(uno.username);
  await datos.pedido(otro.username);
  await page.goto('/pedidos');
  await expect(tarjetas(page, otro.nombre)).toBeVisible();

  await page.locator('input[type=search][placeholder="Buscar pedido…"]').fill(uno.nombre);
  await expect(tarjetas(page, uno.nombre)).toBeVisible();
  await expect(tarjetas(page, otro.nombre)).toHaveCount(0);
});
