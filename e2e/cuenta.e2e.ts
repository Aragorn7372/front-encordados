import { Page } from '@playwright/test';
import { Cuenta, expect, test } from './soporte/fixtures';
import { sesion } from './soporte/usuarios';

/** Entra por el formulario con una cuenta de usar y tirar. */
async function entrar(page: Page, cuenta: Cuenta) {
  await page.goto('/login');
  await page.locator('#username').fill(cuenta.username);
  await page.locator('#password').fill(cuenta.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Menú de usuario' })).toBeVisible();
}

test.describe('sin sesión', () => {
  test('registrarse entra directamente en la app', async ({ page }) => {
    const username = `e2e_reg_${Date.now().toString(36)}`;
    await page.goto('/registro');
    await page.locator('#username').fill(username);
    await page.locator('#email').fill(`${username}@example.com`);
    await page.locator('#password').fill('e2e-clave-123');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('button', { name: 'Menú de usuario' })).toBeVisible();
    await expect(page).not.toHaveURL(/registro/);
  });

  test('el registro valida los campos antes de enviar', async ({ page }) => {
    await page.goto('/registro');
    await page.locator('#username').fill('a');
    await page.locator('#email').fill('no-es-un-email');
    await page.locator('#password').fill('123');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText('El email no es válido')).toBeVisible();
    await expect(page.getByText('Debe tener al menos 6 caracteres')).toBeVisible();
    await expect(page).toHaveURL(/registro/);
  });

  test('«olvidé la contraseña»: envía el enlace a una cuenta que existe', async ({
    page,
    datos,
  }) => {
    const cuenta = await datos.cuentaNueva();
    await page.goto('/recuperar');
    await page.locator('#email').fill(cuenta.email);
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('«olvidé la contraseña» con un email desconocido avisa (ENCUERDATU-85)', async ({
    page,
  }) => {
    await page.goto('/recuperar');
    await page.locator('#email').fill('nadie-e2e@example.com');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    // Hoy el backend dice que no existe: revela qué emails tienen cuenta (tarea de back)
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('un enlace de cambio de contraseña caducado o falso avisa', async ({ page }) => {
    await page.goto('/changePassword?guid=00000000-0000-0000-0000-000000000000');
    const claves = page.locator('input[type=password]');
    await claves.nth(0).fill('nueva-clave-123');
    await claves.nth(1).fill('nueva-clave-123');
    await page.locator('form').getByRole('button').last().click();
    await expect(page.getByRole('alert')).toContainText(/expiró|no se ha encontrado/);
  });
});

test.describe('con sesión', () => {
  test.use({ storageState: sesion('owner') });

  test('una ruta que no existe enseña la página 404', async ({ page }) => {
    await page.goto('/esto-no-existe');
    await expect(page.getByText('404')).toBeVisible();
  });
});

test.describe('perfil', () => {
  test('cambiar el nombre', async ({ page, datos }) => {
    const cuenta = await datos.cuentaNueva();
    await entrar(page, cuenta);
    await page.goto('/perfil');

    await page.locator('#perfil-nombre').fill('Nombre e2e');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Datos guardados')).toBeVisible();
    await expect(page.locator('main')).toContainText('Nombre e2e');
  });

  test('pedir el enlace para cambiar la contraseña', async ({ page, datos }) => {
    const cuenta = await datos.cuentaNueva();
    await entrar(page, cuenta);
    await page.goto('/perfil');

    await page.getByLabel('Email de tu cuenta').fill(cuenta.email);
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.locator('main [role=status]')).toBeVisible();
  });

  test('borrar mi cuenta pide confirmación y saca de la app', async ({ page, datos }) => {
    const cuenta = await datos.cuentaNueva();
    await entrar(page, cuenta);
    await page.goto('/perfil');

    await page.getByRole('button', { name: 'Borrar mi cuenta' }).click();
    await page.locator('dialog[open]').getByRole('button', { name: 'Borrar mi cuenta' }).click();
    await expect(page).toHaveURL(/\/login/);

    // Y ya no puede entrar
    await page.locator('#username').fill(cuenta.username);
    await page.locator('#password').fill(cuenta.password);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.locator('form').getByRole('alert')).toBeVisible();
  });
});
