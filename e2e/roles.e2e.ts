import { unico } from './soporte/api';
import { expect, test } from './soporte/fixtures';
import { USUARIOS, sesion } from './soporte/usuarios';

const tarjeta = (page: import('@playwright/test').Page, texto: string) =>
  page.locator('app-linea-card').filter({ hasText: texto });

test.describe('encordador: mis asignados', () => {
  test.use({ storageState: sesion('encordador') });

  test('ve los pedidos que tiene asignados y puede empezarlos', async ({ page, datos }) => {
    const jugador = await datos.contacto('Asignado');
    await datos.pedido(jugador.username, ['Asignada e2e']);
    await page.goto('/mis-asignados');

    await expect(tarjeta(page, 'Asignada e2e')).toBeVisible();
    await tarjeta(page, 'Asignada e2e').getByRole('button', { name: 'Empezar' }).click();
    await expect(
      page
        .locator('app-kanban-column')
        .filter({ has: page.getByRole('heading', { name: 'En proceso' }) })
        .locator('app-linea-card')
        .filter({ hasText: 'Asignada e2e' }),
    ).toBeVisible();
  });

  test('su menú: sus pedidos, jugadores y torneos; nada de gestión', async ({ page }) => {
    await page.goto('/mis-asignados');
    const menu = page.locator('.drawer-side nav');
    for (const enlace of ['Mis asignados', 'Jugadores', 'Torneos']) {
      await expect(menu.getByRole('link', { name: enlace })).toBeVisible();
    }
    for (const enlace of ['Usuarios', 'Informes', 'Cordajes']) {
      await expect(menu.getByRole('link', { name: enlace })).toHaveCount(0);
    }
  });
});

test.describe('jugador: mis pedidos', () => {
  test.use({ storageState: sesion('jugador') });

  test('ve sus pedidos sin poder moverlos', async ({ page, datos }) => {
    // Nombre único: el jugador ve sus pedidos de todos los torneos, también de ejecuciones
    // anteriores (borrar un torneo no borra sus pedidos)
    const raqueta = unico('Del jugador');
    await datos.pedido(USUARIOS.jugador.username, [raqueta]);
    await page.goto('/mis-pedidos');

    const suya = tarjeta(page, raqueta);
    await expect(suya).toBeVisible();
    await expect(suya.getByRole('button', { name: 'Empezar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Nuevo pedido' })).toHaveCount(0);
  });
});

test.describe('supervisor: informes', () => {
  test.use({ storageState: sesion('supervisor') });

  test('ve el informe del torneo que supervisa', async ({ page, datos }) => {
    const jugador = await datos.contacto('Informe');
    await datos.pedido(jugador.username);
    await page.goto('/informes');

    await expect(page.getByRole('heading', { name: 'Informes', level: 1 })).toBeVisible();
    await expect(page.getByText('Pedidos por estado')).toBeVisible();
    await expect(page.locator('app-stat-card').first()).toBeVisible();
    // No gestiona pedidos
    await page.goto('/pedidos');
    await expect(page.getByText('Acceso no permitido')).toBeVisible();
  });
});
