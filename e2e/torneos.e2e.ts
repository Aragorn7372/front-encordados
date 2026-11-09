import { Page } from '@playwright/test';
import { Api, unico } from './soporte/api';
import { expect, test } from './soporte/fixtures';
import { sesion } from './soporte/usuarios';

test.use({ storageState: sesion('owner') });

const dialogo = (page: Page) => page.locator('dialog[open]').last();
const hoy = (dias = 0) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

/** PNG de 1×1 px: para probar la vista previa del logo sin subir nada a Cloudinary. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('crear y editar un torneo, y gestionar su equipo', async ({ page, request }) => {
  const nombre = unico('Torneo UI');
  try {
    await page.goto('/torneos');
    await page.getByRole('button', { name: 'Nuevo torneo' }).click();
    await dialogo(page).locator('#torneo-name').fill(nombre);
    await dialogo(page).locator('#torneo-start').fill(hoy());
    await dialogo(page).locator('#torneo-end').fill(hoy(5));
    await dialogo(page).getByRole('button', { name: 'Guardar' }).click();
    await expect(dialogo(page)).toBeHidden();

    const tarjeta = page.locator('app-torneo-card').filter({ hasText: nombre });
    await expect(tarjeta).toContainText('Activo');

    const renombrado = `${nombre} bis`;
    await tarjeta.getByRole('button', { name: 'Editar' }).click();
    await dialogo(page).locator('#torneo-name').fill(renombrado);
    await dialogo(page).getByRole('button', { name: 'Guardar' }).click();
    await expect(page.locator('app-torneo-card').filter({ hasText: renombrado })).toBeVisible();

    // Detalle: encordadores y supervisores
    await page.getByRole('link', { name: renombrado }).click();
    await expect(page.getByRole('heading', { name: renombrado })).toBeVisible();

    await page.locator('#worker-user').selectOption({ label: 'María López' });
    await page.locator('#worker-machine').fill('Máquina UI');
    await page.getByRole('button', { name: 'Añadir', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Quitar a maria_encordadora' })).toBeVisible();
    await page.getByRole('button', { name: 'Quitar a maria_encordadora' }).click();
    await page.getByRole('button', { name: /^Quitar$/ }).click();
    await expect(page.getByRole('button', { name: 'Quitar a maria_encordadora' })).toHaveCount(0);

    await page.locator('#supervisor-user').selectOption({ label: 'Pablo Sánchez' });
    await page
      .locator('app-supervisors-panel')
      .getByRole('button', { name: 'Añadir', exact: true })
      .click();
    await expect(page.getByRole('button', { name: 'Quitar a supervisor_pablo' })).toBeVisible();
  } finally {
    // Borrar torneos es solo del admin
    const admin = await Api.como(request, 'admin');
    const torneos = await admin.get<{ content: { id: string; name: string }[] }>(
      '/api/tournaments?page=0&pageSize=500',
    );
    for (const t of torneos.content.filter((t) => t.name.startsWith(nombre))) {
      await admin.borrarTorneo(t.id);
    }
  }
});

test('el logo se ve antes de guardar (sin subirlo)', async ({ page }) => {
  await page.goto('/torneos');
  await page.getByRole('button', { name: 'Nuevo torneo' }).click();
  await dialogo(page).getByLabel('Logotipo').setInputFiles({
    name: 'logo-e2e.png',
    mimeType: 'image/png',
    buffer: PNG,
  });
  await expect(dialogo(page).getByAltText('Vista previa')).toBeVisible();
  await expect(dialogo(page).getByTestId('nombre-fichero')).toHaveText('logo-e2e.png');
  await dialogo(page).getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialogo(page)).toBeHidden();
});

test('el owner no puede borrar torneos; el buscador filtra', async ({ page, datos }) => {
  await page.goto('/torneos');
  const propio = page.locator('app-torneo-card').first();
  await expect(propio).toBeVisible();
  await expect(page.getByRole('button', { name: 'Borrar' })).toHaveCount(0);

  const nombre = (await datos.api.get<{ name: string }>(`/api/tournaments/${datos.torneoId}`)).name;
  await page.locator('input[type=search]').fill(nombre);
  await expect(page.locator('app-torneo-card')).toHaveCount(1);
  await expect(page.locator('app-torneo-card')).toContainText(nombre);
});
