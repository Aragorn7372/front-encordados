import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { APP_CONFIG, AppConfig } from './app/core/config/app-config';

const CONFIG_KEY = 'etr_config';
const POR_DEFECTO: AppConfig = { apiUrl: '' };

/**
 * La configuración se descarga al arrancar. Sin red (PWA) no puede impedir que la app abra:
 * se usa la última buena, y si nunca hubo ninguna, la de por defecto (API en el mismo dominio).
 */
async function cargarConfig(): Promise<AppConfig> {
  try {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`config.json: ${res.status}`);
    const config = (await res.json()) as AppConfig;
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch {
      // Sin almacenamiento (modo privado): no pasa nada, la próxima vez se descarga
    }
    return config;
  } catch {
    try {
      const guardada = localStorage.getItem(CONFIG_KEY);
      if (guardada) return JSON.parse(guardada) as AppConfig;
    } catch {
      // Sigue con la de por defecto
    }
    return POR_DEFECTO;
  }
}

cargarConfig()
  .then((config) =>
    bootstrapApplication(App, {
      ...appConfig,
      providers: [...appConfig.providers, { provide: APP_CONFIG, useValue: config }],
    }),
  )
  .catch((err) => console.error(err));
