import { Page } from '@playwright/test';
import { unico } from './soporte/api';
import { expect, test } from './soporte/fixtures';
import { esperarExcel } from './soporte/ficheros';
import { sesion } from './soporte/usuarios';

test.use({ storageState: sesion('owner') });

const fila = (page: Page, nombre: string) => page.getByRole('row').filter({ hasText: nombre });
const dialogo = (page: Page) => page.locator('dialog[open]').last();

test('owner: crea un jugador y le da bonos, pero no puede editarlo ni borrarlo', async ({
  page,
  datos,
}) => {
  const nombre = unico('Nuevo');
  await page.goto('/jugadores');

  await page.getByRole('button', { name: 'Nuevo jugador' }).click();
  await dialogo(page).locator('#contacto-nombre').fill(nombre);
  await dialogo(page).getByRole('button', { name: 'Crear jugador' }).click();
  await expect(fila(page, nombre)).toBeVisible();
  await expect(fila(page, nombre)).toContainText('Sin email');

  await page.getByRole('button', { name: `Añadir bonos a ${nombre}` }).click();
  await dialogo(page).locator('#bonos-cantidad').fill('12');
  await dialogo(page).getByRole('button', { name: 'Añadir bonos' }).click();
  await expect(fila(page, nombre)).toContainText(/12,00\s€/);

  // Editar y borrar jugadores es solo del administrador
  await expect(page.getByRole('button', { name: `Editar a ${nombre}` })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Borrar a ${nombre}` })).toHaveCount(0);
});

test.describe('admin', () => {
  test.use({ storageState: sesion('admin') });

  test('edita un jugador y lo borra', async ({ page, datos }) => {
    const jugador = await datos.contacto('Editar');
    await page.goto('/jugadores');

    const renombrado = `${jugador.nombre} bis`;
    await page.getByRole('button', { name: `Editar a ${jugador.nombre}` }).click();
    await dialogo(page).locator('#jugador-nombre').fill(renombrado);
    await dialogo(page).getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(fila(page, renombrado)).toBeVisible();

    await page.getByRole('button', { name: `Borrar a ${renombrado}` }).click();
    await page.getByRole('button', { name: 'Borrar', exact: true }).click();
    await expect(fila(page, renombrado)).toHaveCount(0);
  });
});

test('el buscador filtra los jugadores', async ({ page, datos }) => {
  const uno = await datos.contacto('Filtro uno');
  const otro = await datos.contacto('Filtro otro');
  await page.goto('/jugadores');
  await expect(fila(page, otro.nombre)).toBeVisible();

  await page.locator('input[type=search]').fill(uno.nombre);
  await expect(fila(page, uno.nombre)).toBeVisible();
  await expect(fila(page, otro.nombre)).toHaveCount(0);
});

test('copiar contactos los deja en el portapapeles', async ({ page, context, datos }) => {
  const jugador = await datos.contacto('Copiar');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/jugadores');
  await expect(fila(page, jugador.nombre)).toBeVisible();

  await page.getByRole('button', { name: 'Copiar contactos' }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain(jugador.nombre);
});

test('exportar a Excel descarga un .xlsx válido', async ({ page }) => {
  await page.goto('/jugadores');
  const descarga = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar Excel' }).click();
  await esperarExcel(await descarga, /\.xlsx$/);
});

test('importar Excel: abre el selector de ficheros (sin importar nada)', async ({ page }) => {
  await page.goto('/jugadores');
  const selector = page.waitForEvent('filechooser');
  await page.getByText('Importar Excel').click();
  const elegir = await selector;
  expect(elegir.isMultiple()).toBe(false);
  await expect(page.getByLabel('Fichero Excel a importar')).toHaveAttribute('accept', '.xlsx');
});
