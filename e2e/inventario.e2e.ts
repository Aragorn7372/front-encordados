import { Page } from '@playwright/test';
import { unico } from './soporte/api';
import { expect, test } from './soporte/fixtures';
import { esperarExcel } from './soporte/ficheros';
import { sesion } from './soporte/usuarios';

test.use({ storageState: sesion('owner') });

const fila = (page: Page, texto: string) => page.getByRole('row').filter({ hasText: texto });
const dialogo = (page: Page) => page.locator('dialog[open]').last();

for (const caso of [
  {
    pantalla: 'cordajes',
    nuevo: 'Nuevo cordaje',
    crear: 'Crear cordaje',
    campo: 'cordaje',
    api: 'cuerdas' as const,
  },
  {
    pantalla: 'materiales',
    nuevo: 'Nuevo material',
    crear: 'Crear material',
    campo: 'material',
    api: 'materials' as const,
  },
]) {
  test.describe(caso.pantalla, () => {
    test('crear, cambiar el stock, editar y borrar', async ({ page, datos }) => {
      const modelo = unico('Modelo');
      test.info().annotations.push({ type: 'modelo', description: modelo });
      try {
        await page.goto(`/${caso.pantalla}`);
        await page.getByRole('button', { name: caso.nuevo }).click();
        const d = dialogo(page);
        await d.locator(`#${caso.campo}-marca`).fill('Marca e2e');
        await d.locator(`#${caso.campo}-modelo`).fill(modelo);
        await d.locator(`#${caso.campo}-precio`).fill('15.5');
        await d.locator(`#${caso.campo}-stock`).fill('3');
        await d.getByRole('button', { name: caso.crear }).click();
        await expect(d).toBeHidden();

        // Con 3 está por debajo del mínimo: sale como stock bajo
        const suya = fila(page, modelo);
        await expect(suya).toContainText(/15,50\s€/);
        await expect(suya.getByText('3', { exact: true })).toHaveAttribute('title', /bajo/i);

        await page.getByRole('button', { name: `Añadir uno a ${modelo}` }).click();
        await expect(suya.getByText('4', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: `Quitar uno de ${modelo}` }).click();
        await expect(suya.getByText('3', { exact: true })).toBeVisible();

        // El ± no envía el precio y el servidor lo conserva (ENCUERDATU-69): tras recargar sigue en 15,50
        await page.reload();
        await expect(suya).toContainText(/15,50\s€/);
        await expect(suya.getByText('3', { exact: true })).toBeVisible();

        await page.getByRole('button', { name: `Editar ${modelo}` }).click();
        await dialogo(page).locator(`#${caso.campo}-precio`).fill('20');
        await dialogo(page).getByRole('button', { name: 'Guardar cambios' }).click();
        await expect(suya).toContainText(/20,00\s€/);

        await page.getByRole('button', { name: `Borrar ${modelo}` }).click();
        await page.getByRole('button', { name: 'Borrar', exact: true }).click();
        await expect(fila(page, modelo)).toHaveCount(0);
      } finally {
        await datos.api.borrarInventario(caso.api, datos.torneoId, modelo);
      }
    });

    test('filtro de stock bajo y buscador', async ({ page, datos }) => {
      const poco = unico('Poco');
      const mucho = unico('Mucho');
      try {
        await page.goto(`/${caso.pantalla}`);
        for (const [modelo, stock] of [
          [poco, '2'],
          [mucho, '50'],
        ]) {
          await page.getByRole('button', { name: caso.nuevo }).click();
          const d = dialogo(page);
          await d.locator(`#${caso.campo}-marca`).fill('Marca e2e');
          await d.locator(`#${caso.campo}-modelo`).fill(modelo);
          await d.locator(`#${caso.campo}-precio`).fill('10');
          await d.locator(`#${caso.campo}-stock`).fill(stock);
          await d.getByRole('button', { name: caso.crear }).click();
          await expect(d).toBeHidden();
        }

        await page.getByText('Solo stock bajo').click();
        await expect(fila(page, poco)).toBeVisible();
        await expect(fila(page, mucho)).toHaveCount(0);
        await page.getByText('Solo stock bajo').click();

        await page.locator('input[type=search]').fill(mucho);
        await expect(fila(page, mucho)).toBeVisible();
        await expect(fila(page, poco)).toHaveCount(0);
      } finally {
        await datos.api.borrarInventario(caso.api, datos.torneoId, poco);
        await datos.api.borrarInventario(caso.api, datos.torneoId, mucho);
      }
    });

    test('exportar a Excel descarga un .xlsx; importar solo abre el selector', async ({ page }) => {
      await page.goto(`/${caso.pantalla}`);
      const descarga = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Exportar Excel' }).click();
      await esperarExcel(await descarga, /\.xlsx$/);

      const selector = page.waitForEvent('filechooser');
      await page.getByText('Importar Excel').click();
      await selector;
    });
  });
}
