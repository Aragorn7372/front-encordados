import { expect, test } from './soporte/fixtures';
import { esperarExcel } from './soporte/ficheros';
import { sesion } from './soporte/usuarios';

test.use({ storageState: sesion('owner') });

test.describe('terminados', () => {
  test('un pedido listo aparece, con filtros y buscador', async ({ page, datos }) => {
    const jugador = await datos.contacto('Terminado');
    const pedido = await datos.pedido(jugador.username);
    await datos.api.estadoLinea(pedido.lineas[0].id, 'COMPLETED');
    await page.goto('/terminados');

    const fila = page.getByRole('row').filter({ hasText: jugador.nombre });
    await expect(fila).toContainText('Listo');
    await expect(page.locator('app-stat-card').first()).toBeVisible();

    await page.locator('input[type=search]').fill(jugador.nombre);
    await expect(page.getByRole('row')).toHaveCount(2); // cabecera + el suyo

    await page.getByLabel('Filtrar por estado').selectOption({ label: 'Entregado' });
    await expect(fila).toHaveCount(0);
  });

  test('exportar a Excel descarga un .xlsx', async ({ page }) => {
    await page.goto('/terminados');
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar Excel' }).click();
    await esperarExcel(await descarga, /\.xlsx$/);
  });
});

test.describe('informes', () => {
  test('KPIs y gráficas; el filtro de jugador cambia el informe', async ({ page, datos }) => {
    const jugador = await datos.contacto('Informe owner');
    await datos.pedido(jugador.username, ['Una', 'Dos']);
    await page.goto('/informes');

    for (const grafica of ['Pedidos por estado', 'Pedidos por día', 'Ingresos por día']) {
      await expect(page.getByText(grafica)).toBeVisible();
    }
    const raquetas = page.locator('app-stat-card').filter({ hasText: 'Raquetas' });
    await expect(raquetas).toBeVisible();

    await page.getByPlaceholder('Nombre…').fill(jugador.nombre);
    await expect(raquetas).toContainText('2');
    await expect(
      page.locator('app-stat-card').filter({ hasText: 'Pedidos' }).first(),
    ).toContainText('1');
  });

  test('exportar a Excel descarga un .xlsx; importar solo abre el selector', async ({ page }) => {
    await page.goto('/informes');
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar Excel' }).click();
    await esperarExcel(await descarga, /\.xlsx$/);

    const selector = page.waitForEvent('filechooser');
    await page.getByText('Importar Excel').click();
    await selector;
  });
});
