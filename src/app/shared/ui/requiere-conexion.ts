import { DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import { injectSinConexion } from '../../core/offline/sin-conexion';

/**
 * Para lo que no tiene sentido sin conexión (backup, Excel, roles, gestionar torneos…): sin red
 * el botón se ve apagado y, al pasar por encima, dice por qué, en vez de fallar al pulsarlo.
 *
 * No usa `disabled` ni `btn-disabled`: el primero se pelearía con el `[disabled]` que ya tenga
 * el botón, y los dos quitan los eventos del ratón, así que el motivo (`title`) no se vería.
 * Se bloquea el clic, que también es lo que genera el teclado y lo que envía un formulario.
 * `appRequiereConexion="Texto"` cambia el motivo.
 */
@Directive({
  selector: '[appRequiereConexion]',
  host: {
    '[class.opacity-50]': 'sinConexion()',
    '[class.cursor-not-allowed]': 'sinConexion()',
    '[attr.aria-disabled]': 'sinConexion() || null',
    '[attr.title]': 'sinConexion() ? motivo() : null',
  },
})
export class RequiereConexion {
  readonly appRequiereConexion = input<string>('');
  protected readonly sinConexion = injectSinConexion();

  constructor() {
    const elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    // En captura: en el propio elemento va antes que el (click) de la plantilla, se haya
    // registrado antes o después (un host listener normal no garantiza ese orden)
    const bloquear = (event: Event) => {
      if (!this.sinConexion()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    elemento.addEventListener('click', bloquear, { capture: true });
    inject(DestroyRef).onDestroy(() =>
      elemento.removeEventListener('click', bloquear, { capture: true }),
    );
  }

  protected motivo(): string {
    return this.appRequiereConexion() || 'Necesitas conexión para esto';
  }
}
