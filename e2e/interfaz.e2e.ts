import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { sesion } from './soporte/usuarios';

test.use({ storageState: sesion('owner') });

test('el tema oscuro se recuerda al recargar', async ({ page }) => {
  await page.goto('/pedidos');
  const html = page.locator('html');
  const inicial = await html.getAttribute('data-theme');
  const otro = inicial === 'black' ? 'corporate' : 'black';

  await page.getByRole('button', { name: /Usar tema/ }).click();
  await expect(html).toHaveAttribute('data-theme', otro);
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', otro);
});

test('menú lateral: fijo en pantalla grande, se cierra con la X y vuelve con la hamburguesa', async ({
  page,
}) => {
  await page.goto('/pedidos');
  const menu = page.locator('.drawer-side nav');
  await expect(menu).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir menú' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Cerrar menú' }).click();
  await expect(menu).toBeHidden();
  await page.reload();
  await expect(menu).toBeHidden(); // se recuerda

  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(menu).toBeVisible();
  await page.getByRole('link', { name: 'Jugadores' }).click();
  await expect(page).toHaveURL(/\/jugadores$/);
  await expect(menu).toBeVisible(); // fijo: sigue abierto al navegar
});

test('avatar animado: el interruptor cambia las fotos por defecto por blobs', async ({ page }) => {
  await page.goto('/usuarios');
  await expect(page.locator('app-avatar').first()).toBeVisible();
  await expect(page.locator('blob-avatar')).toHaveCount(0);

  await page.getByRole('button', { name: 'Menú de usuario' }).click();
  await page.getByTestId('avatar-animado').click();
  await expect(page.locator('blob-avatar').first()).toBeVisible();
});

test.describe('accesibilidad (axe, WCAG 2 A/AA)', () => {
  const PANTALLAS = [
    '/pedidos',
    '/terminados',
    '/jugadores',
    '/cordajes',
    '/materiales',
    '/torneos',
    '/informes',
    '/usuarios',
    '/perfil',
  ];

  for (const tema of ['corporate', 'black']) {
    for (const ruta of PANTALLAS) {
      test(`${ruta} en tema ${tema}`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem('etr_theme', t), tema);
        await page.goto(ruta);
        await expect(page.locator('main h1')).toBeVisible();
        // Que termine de cargar: sin esqueletos ni spinners
        await expect(page.locator('phantom-ui[loading], main .loading')).toHaveCount(0);

        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        const resumen = violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        );
        expect(resumen, 'problemas de accesibilidad').toEqual([]);
      });
    }
  }
});
