import { Page } from '@playwright/test';
import { expect, test } from './soporte/fixtures';
import { sesion } from './soporte/usuarios';

test.use({ storageState: sesion('owner') });

const pestanas = (page: Page) => page.getByRole('navigation', { name: 'Columnas del tablero' });
const carrusel = (page: Page) => page.locator('.snap-x');

test('el tablero es un carrusel: las pestañas llevan a cada columna sin mover la página', async ({
  page,
  datos,
}) => {
  const jugador = await datos.contacto('Movil');
  await datos.pedido(jugador.username);
  await page.goto('/pedidos');

  await expect(pestanas(page).getByRole('button', { name: /Pendiente/ })).toHaveAttribute(
    'aria-current',
    'true',
  );
  const y = await page.evaluate(() => scrollY);

  await pestanas(page).getByRole('button', { name: /Listo/ }).click();
  await expect(pestanas(page).getByRole('button', { name: /Listo/ })).toHaveAttribute(
    'aria-current',
    'true',
  );
  // La columna «Listo» encaja en el borde izquierdo del carrusel
  await expect
    .poll(() =>
      carrusel(page).evaluate((el) => {
        const inicio =
          el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft);
        return Math.round(el.children[2].getBoundingClientRect().left - inicio);
      }),
    )
    .toBe(0);
  expect(await page.evaluate(() => scrollY)).toBe(y);
});

test('al soltar a medias, el carrusel encaja en una columna (nunca entre dos)', async ({
  page,
}) => {
  await page.goto('/pedidos');
  await expect(carrusel(page)).toBeVisible();
  // Un desplazamiento suelto, como un dedo que suelta a mitad de camino
  await carrusel(page).evaluate((el) => el.scrollBy({ left: 90 }));
  await expect
    .poll(() =>
      carrusel(page).evaluate((el) => {
        const inicio =
          el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft);
        return [...el.children].some((c) => Math.abs(c.getBoundingClientRect().left - inicio) < 2);
      }),
    )
    .toBe(true);
});

test('en móvil las tarjetas no se arrastran: se mueven con sus botones', async ({
  page,
  datos,
}) => {
  const jugador = await datos.contacto('Movil botones');
  await datos.pedido(jugador.username);
  await page.goto('/pedidos');

  const tarjeta = page.locator('app-linea-card').filter({ hasText: jugador.nombre });
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta).toHaveClass(/cdk-drag-disabled/);

  await tarjeta.getByRole('button', { name: 'Empezar' }).click();
  await pestanas(page)
    .getByRole('button', { name: /En proceso/ })
    .click();
  const enProceso = page
    .locator('app-kanban-column')
    .filter({ has: page.getByRole('heading', { name: 'En proceso' }) });
  await expect(
    enProceso.locator('app-linea-card').filter({ hasText: jugador.nombre }),
  ).toBeVisible();
});

test('barra superior en móvil: el torneo se lee entero y el tema está en el menú', async ({
  page,
}) => {
  await page.goto('/pedidos');
  const selector = page.locator('select[aria-label="Torneo activo"]:visible');
  await expect(selector).toBeVisible();
  // El nombre elegido cabe en el selector
  expect(
    await selector.evaluate((s: HTMLSelectElement) => {
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.font = getComputedStyle(s).font;
      return ctx.measureText(s.options[s.selectedIndex].text.trim()).width < s.clientWidth - 30;
    }),
  ).toBe(true);

  await expect(page.getByRole('button', { name: /Usar tema/ })).toBeHidden();
  await page.getByRole('button', { name: 'Menú de usuario' }).click();
  await expect(page.getByText('Modo oscuro')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
