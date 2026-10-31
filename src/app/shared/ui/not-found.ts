import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StatusPage } from './status-page';

@Component({
  selector: 'app-not-found',
  imports: [StatusPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-status-page
      code="404"
      heading="Página no encontrada"
      message="La dirección no existe o ha cambiado."
    />
  `,
})
export default class NotFound {}
