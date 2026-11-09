import fs from 'node:fs';
import { Page } from '@playwright/test';
import { expect, test } from './soporte/fixtures';
import { sesion } from './soporte/usuarios';

test.use({ storageState: sesion('admin') });

const fila = (page: Page, texto: string) => page.getByRole('row').filter({ hasText: texto });
const dialogo = (page: Page) => page.locator('dialog[open]').last();
/** Las pestañas por tipo de usuario: siempre se mira uno. */
const pestana = (page: Page, nombre: string) =>
  page.getByRole('tab', { name: new RegExp(`^${nombre}`) }).click();
/** En una pestaña puede haber varias páginas: la cuenta se busca, como haría cualquiera. */
async function buscarEn(page: Page, tipo: string, texto: string) {
  await pestana(page, tipo);
  await page.locator('input[type=search]').fill(texto);
}

test('una cuenta nueva sale «sin rol» y se le puede dar rol de supervisor', async ({
  page,
  datos,
}) => {
  const cuenta = await datos.cuentaNueva();
  await page.goto('/usuarios');
  await buscarEn(page, 'Sin rol', cuenta.username);
  await expect(fila(page, cuenta.username)).toContainText('Sin rol');

  await page.getByRole('button', { name: `Dar rol a ${cuenta.username}` }).click();
  await dialogo(page).locator('#rol-nuevo').selectOption('SUPERVISOR');
  await dialogo(page).getByRole('button', { name: 'Dar rol de Supervisor' }).click();
  // Pasa a la pestaña de supervisores
  await expect(fila(page, cuenta.username)).toHaveCount(0);
  await buscarEn(page, 'Supervisores', cuenta.username);
  await expect(fila(page, cuenta.username)).toContainText('Supervisor');
});

test('borrar una cuenta pide confirmación', async ({ page, datos }) => {
  const cuenta = await datos.cuentaNueva();
  await page.goto('/usuarios');
  await buscarEn(page, 'Sin rol', cuenta.username);

  await page.getByRole('button', { name: `Borrar a ${cuenta.username}` }).click();
  await expect(page.getByRole('heading', { name: 'Borrar usuario' })).toBeVisible();
  await page.getByRole('button', { name: 'Borrar', exact: true }).click();
  await expect(fila(page, cuenta.username)).toHaveCount(0);
});

test('pestañas por tipo; el buscador busca dentro de la pestaña', async ({ page, datos }) => {
  const cuenta = await datos.cuentaNueva();
  await page.goto('/usuarios');

  // Empieza en encordadores: la cuenta nueva (sin rol) no sale aquí ni buscándola
  await expect(page.getByRole('tab', { name: /^Encordadores/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(fila(page, 'carlos_encordador')).toBeVisible();
  await page.locator('input[type=search]').fill(cuenta.username);
  await expect(fila(page, cuenta.username)).toHaveCount(0);

  await pestana(page, 'Sin rol'); // la búsqueda se mantiene al cambiar de pestaña
  await expect(fila(page, cuenta.username)).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(2); // cabecera + la suya
});

test('copia de seguridad: se descarga, y restaurar se queda en la pantalla previa', async ({
  page,
}) => {
  await page.goto('/usuarios');
  await expect(page.getByRole('heading', { name: 'Copia de seguridad' })).toBeVisible();

  const descarga = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar copia' }).click();
  const copia = await descarga;
  expect(copia.suggestedFilename()).toMatch(/\.zip$/);
  const ruta = await copia.path();
  expect(fs.readFileSync(ruta).subarray(0, 2).toString()).toBe('PK');

  // Elegir esa misma copia enseña lo que trae, sin restaurar nada
  await page.getByLabel('Copia de seguridad a restaurar').setInputFiles(ruta);
  await expect(page.getByLabel('Contenido de la copia')).toBeVisible();
  const restaurar = page.getByRole('button', { name: 'Borrar todo y restaurar' });
  await expect(restaurar).toBeDisabled(); // hasta escribir la palabra, que el test nunca escribe
  await page.getByLabel('Contenido de la copia').getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByLabel('Contenido de la copia')).toBeHidden();
});

test.describe('owner', () => {
  test.use({ storageState: sesion('owner') });

  test('hace encordador a una cuenta sin rol (el admin, en cambio, da rol)', async ({
    page,
    datos,
  }) => {
    const cuenta = await datos.cuentaNueva();
    await page.goto('/usuarios');
    await buscarEn(page, 'Sin rol', cuenta.username);

    await page.getByRole('button', { name: `Hacer encordador a ${cuenta.username}` }).click();
    await page.getByRole('button', { name: 'Hacer encordador', exact: true }).click();
    await buscarEn(page, 'Encordadores', cuenta.username);
    await expect(fila(page, cuenta.username)).toContainText('Encordador');
  });

  test('ve encordadores, supervisores, jugadores y sin rol; no la copia ni dar roles', async ({
    page,
    datos,
  }) => {
    const cuenta = await datos.cuentaNueva();
    await page.goto('/usuarios');
    await expect(page.getByRole('heading', { name: 'Usuarios', level: 1 })).toBeVisible();
    for (const tipo of ['Encordadores', 'Supervisores', 'Jugadores', 'Sin rol']) {
      await expect(page.getByRole('tab', { name: new RegExp(`^${tipo}`) })).toBeVisible();
    }
    await expect(page.getByRole('tab', { name: /^Propietarios/ })).toHaveCount(0);
    await buscarEn(page, 'Sin rol', cuenta.username);
    await expect(page.getByRole('heading', { name: 'Copia de seguridad' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: `Dar rol a ${cuenta.username}` })).toHaveCount(0);
  });
});
