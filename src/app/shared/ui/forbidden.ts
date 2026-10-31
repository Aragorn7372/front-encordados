import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StatusPage } from './status-page';

@Component({
  selector: 'app-forbidden',
  imports: [StatusPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-status-page
      code="403"
      heading="Acceso no permitido"
      message="Tu cuenta no tiene permiso para ver esta página."
    />
  `,
})
export default class Forbidden {}
