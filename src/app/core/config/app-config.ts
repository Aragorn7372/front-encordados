import { InjectionToken } from '@angular/core';
export interface AppConfig {
  apiUrl: string;
}
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
