import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { APP_CONFIG, AppConfig } from './app/core/config/app-config';

fetch('/config.json', { cache: 'no-store' })
  .then((res) => res.json() as Promise<AppConfig>)
  .then((config) =>
    bootstrapApplication(App, {
      ...appConfig,
      providers: [...appConfig.providers, { provide: APP_CONFIG, useValue: config }],
    }),
  )
  .catch((err) => console.error(err));
