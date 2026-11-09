import { expect, test } from '@playwright/test';
import { Rol, USUARIOS, sesion } from './soporte/usuarios';

test.describe('Entrar en la app', () => {
  for (const rol of Object.keys(USUARIOS) as Rol[]) {
    test(`${rol}: el login lleva a su pantalla de inicio`, async ({ page }) => {
      const { username, password, home } = USUARIOS[rol];
      await page.goto('/login');
      await page.locator('#username').fill(username);
      await page.locator('#password').fill(password);
      await page.getByRole('button', { name: 'Entrar' }).click();
      await expect(page).toHaveURL(new RegExp(`${home}$`));
      await expect(page.getByRole('button', { name: 'Menú de usuario' })).toBeVisible();
    });
  }

  test('con una contraseña incorrecta avisa y no entra', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill(USUARIOS.owner.username);
    await page.locator('#password').fill('no-es-esta');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('sin sesión, una ruta protegida manda al login', async ({ page }) => {
    await page.goto('/usuarios');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Permisos por rol', () => {
  test.describe('jugador', () => {
    test.use({ storageState: sesion('jugador') });

    test('no puede ver usuarios: 403', async ({ page }) => {
      await page.goto('/usuarios');
      await expect(page.getByText('Acceso no permitido')).toBeVisible();
    });
  });

  test.describe('encordador', () => {
    test.use({ storageState: sesion('encordador') });

    test('no puede ver usuarios ni informes', async ({ page }) => {
      for (const ruta of ['/usuarios', '/informes']) {
        await page.goto(ruta);
        await expect(page.getByText('Acceso no permitido')).toBeVisible();
      }
    });
  });

  test.describe('owner', () => {
    test.use({ storageState: sesion('owner') });

    test('cerrar sesión vuelve al login y olvida la sesión', async ({ page }) => {
      await page.goto('/pedidos');
      await page.getByRole('button', { name: 'Menú de usuario' }).click();
      await page.getByRole('button', { name: 'Cerrar sesión' }).click();
      // Si hay cambios sin enviar, pide confirmación: aquí no debería haberlos
      await expect(page).toHaveURL(/\/login/);
      await page.goto('/pedidos');
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
