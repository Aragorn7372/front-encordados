import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { leerCodigo } from '../../../shared/models/codigo-pedido';
import { Role } from '../../../shared/models/roles';
import { PageHeader } from '../../../shared/ui/page-header';
import { CamaraEscaner } from '../ui/camara-escaner';

/** Dónde ve cada rol sus pedidos: ahí se abre el escaneado. */
const PEDIDOS_DE: Partial<Record<Role, string>> = {
  ADMIN: '/pedidos',
  OWNER: '/pedidos',
  ENCORDER: '/mis-asignados',
  USER: '/mis-pedidos',
};

/**
 * Escanear un pedido: con la cámara, escribiendo el código o con un lector USB/Bluetooth (que
 * escribe como un teclado y pulsa Intro). Si llega con `?codigo=` (el QR abierto con la cámara
 * del móvil) se abre directamente.
 */
@Component({
  selector: 'app-escaner-page',
  imports: [CamaraEscaner, PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header heading="Escanear" />

    <div class="mx-auto flex max-w-xl flex-col gap-4">
      <p class="text-sm opacity-70">
        Apunta al QR o al código de barras de la pegatina: se abre su pedido.
      </p>

      <app-camara-escaner (leido)="abrir($event)" />

      @if (noReconocido(); as texto) {
        <div role="alert" class="alert alert-error alert-soft">
          <span>«{{ texto }}» no es el código de un pedido.</span>
        </div>
      }

      <form class="join w-full" (submit)="enviar($event, manual)">
        <input
          #manual
          class="input join-item w-full font-mono"
          placeholder="O escribe el código, o usa un lector"
          aria-label="Código del pedido"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
        />
        <button class="btn btn-primary join-item">Abrir</button>
      </form>
    </div>
  `,
})
export default class EscanerPage {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);

  /** Desde la URL del QR: `/escanear?codigo=<id>`. */
  readonly codigo = input<string>();
  protected readonly noReconocido = signal<string | null>(null);

  private readonly manual = viewChild.required<ElementRef<HTMLInputElement>>('manual');

  constructor() {
    effect(() => {
      const codigo = this.codigo();
      if (codigo) this.abrir(codigo);
    });
    // Con ratón (un mostrador con lector USB), el lector escribe directamente en el campo.
    // En el móvil no: abriría el teclado encima de la cámara
    afterNextRender(() => {
      if (globalThis.matchMedia?.('(pointer: fine)').matches) this.manual().nativeElement.focus();
    });
  }

  protected abrir(texto: string): void {
    const leido = leerCodigo(texto);
    if (leido.tipo === 'desconocido') {
      this.noReconocido.set(leido.texto);
      return;
    }
    const rol = this.auth.role();
    const destino = rol ? PEDIDOS_DE[rol] : undefined;
    if (!destino) return;
    void this.router.navigate([destino], { queryParams: { openPedido: leido.id } });
  }

  protected enviar(event: Event, campo: HTMLInputElement): void {
    event.preventDefault();
    if (!campo.value.trim()) return;
    this.abrir(campo.value);
    campo.value = '';
  }
}
