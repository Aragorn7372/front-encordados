import { EnvironmentProviders, LOCALE_ID, makeEnvironmentProviders } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

export function provideSpanishLocale(): EnvironmentProviders {
  registerLocaleData(localeEs);
  return makeEnvironmentProviders([{ provide: LOCALE_ID, useValue: 'es-ES' }]);
}
