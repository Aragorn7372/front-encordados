import { defineConfig, devices } from '@playwright/test';

/**
 * E2E del front (lección 17). Prueban la app de verdad contra un backend real.
 *
 * - Sin E2E_BASE_URL: levanta e2e/servidor.mjs, que sirve el build actual (npm run build) y
 *   reenvía /api y /hub a E2E_API (por defecto el nginx del docker-compose, https://localhost).
 * - Con E2E_BASE_URL: prueba esa URL tal cual (por ejemplo, el docker-compose entero).
 * - E2E_PORT: el puerto de servidor.mjs (por defecto 4310).
 *
 * 2 workers en paralelo: los tests no dependen unos de otros, y los que crean datos usan
 * nombres únicos (fixture `datos`). Todo pasa en un torneo propio de la ejecución, que se crea
 * al empezar y se borra al acabar (sesiones.setup / limpieza.teardown). Pensados para bases de
 * datos temporales: lo demás que crean no se borra.
 */
// Vacía cuenta como no puesta (en el CI es cómodo dejarla así)
const URL_FIJA = process.env['E2E_BASE_URL'] || undefined;
const BASE_URL = URL_FIJA ?? `http://localhost:${process.env['E2E_PORT'] ?? 4310}`;
const CI = !!process.env['CI'];

export default defineConfig({
  testDir: '.',
  outputDir: './resultados',
  fullyParallel: true,
  workers: 2,
  // En el CI, un reintento para lo que dependa de tiempos de red; en local se ve el fallo a la primera
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: './informe', open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    // El certificado local (mkcert) o el del docker del CI no tienen por qué ser de confianza
    ignoreHTTPSErrors: true,
    // Sin service worker: así cada test ve el build actual, no una copia guardada
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'sesiones', testMatch: /sesiones\.setup\.ts/, teardown: 'limpieza' },
    { name: 'limpieza', testMatch: /limpieza\.teardown\.ts/ },
    {
      name: 'escritorio',
      testMatch: /\.e2e\.ts$/,
      testIgnore: /movil\.e2e\.ts$/,
      dependencies: ['sesiones'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 } },
    },
    {
      name: 'movil',
      testMatch: /movil\.e2e\.ts$/,
      dependencies: ['sesiones'],
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: URL_FIJA
    ? undefined
    : {
        command: 'node e2e/servidor.mjs',
        cwd: '..',
        url: BASE_URL,
        reuseExistingServer: !CI,
        timeout: 30_000,
      },
});
