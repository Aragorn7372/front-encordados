import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ESPERA_ESQUELETO_MS, Esqueleto, FilasEsqueleto } from './esqueleto';

@Component({
  imports: [Esqueleto, FilasEsqueleto],
  template: `
    <app-esqueleto [cargando]="cargando()" [hayDatos]="hayDatos()" [refresco]="refresco()">
      <table>
        <tbody app-filas-esqueleto [columnas]="3"></tbody>
      </table>
    </app-esqueleto>
  `,
})
class Prueba {
  readonly cargando = signal(true);
  readonly hayDatos = signal(false);
  readonly refresco = signal(false);
}

describe('Esqueleto', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Pasa la espera y deja que Angular pinte. */
  async function esperar(fixture: { whenStable(): Promise<unknown> }) {
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(ESPERA_ESQUELETO_MS);
    TestBed.tick();
    await fixture.whenStable();
  }

  async function crear() {
    const fixture = TestBed.createComponent(Prueba);
    await esperar(fixture);
    const phantom = () => fixture.nativeElement.querySelector('phantom-ui') as HTMLElement;
    return { fixture, phantom };
  }

  it('primera carga: esqueleto que oculta el contenido', async () => {
    const { phantom } = await crear();
    expect(phantom().hasAttribute('loading')).toBe(true);
    expect(phantom().getAttribute('mode')).toBe('skeleton');
  });

  it('con refresco, una recarga con datos los deja ver atenuados', async () => {
    const { fixture, phantom } = await crear();
    fixture.componentInstance.hayDatos.set(true);
    fixture.componentInstance.refresco.set(true);
    await esperar(fixture);
    expect(phantom().hasAttribute('loading')).toBe(true);
    expect(phantom().getAttribute('mode')).toBe('overlay');
  });

  it('por defecto, una recarga con datos no se marca (la copia local se refresca sola)', async () => {
    const { fixture, phantom } = await crear();
    fixture.componentInstance.hayDatos.set(true);
    await esperar(fixture);
    expect(phantom().hasAttribute('loading')).toBe(false);
  });

  it('al terminar de cargar, nada', async () => {
    const { fixture, phantom } = await crear();
    fixture.componentInstance.cargando.set(false);
    await esperar(fixture);
    expect(phantom().hasAttribute('loading')).toBe(false);
  });

  it('una carga corta no llega a enseñar el esqueleto', async () => {
    const fixture = TestBed.createComponent(Prueba);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(ESPERA_ESQUELETO_MS / 2);
    fixture.componentInstance.cargando.set(false);
    await esperar(fixture);
    expect(fixture.nativeElement.querySelector('phantom-ui').hasAttribute('loading')).toBe(false);
  });

  it('la tabla vacía lleva un solo bloque, del ancho de todas las columnas', async () => {
    const { fixture } = await crear();
    const filas = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(filas.length).toBe(1);
    expect(filas[0].querySelector('td').getAttribute('colspan')).toBe('3');
  });
});
