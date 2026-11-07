import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OfflineState } from '../../core/offline/offline-state';
import { PwaService } from '../../core/pwa/pwa.service';
import { RequiereConexion } from './requiere-conexion';

@Component({
  imports: [RequiereConexion],
  template: `<button
    type="button"
    appRequiereConexion="El Excel necesita conexión"
    (click)="pulsado = true"
  >
    Exportar
  </button>`,
})
class Prueba {
  pulsado = false;
}

describe('RequiereConexion', () => {
  const conectado = signal(true);

  const render = async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PwaService, useValue: { conectado } }],
    });
    const fixture = TestBed.createComponent(Prueba);
    await fixture.whenStable();
    return { fixture, boton: fixture.nativeElement.querySelector('button') as HTMLButtonElement };
  };

  beforeEach(() => {
    localStorage.clear();
    conectado.set(true);
  });

  it('con conexión no hace nada', async () => {
    const { fixture, boton } = await render();

    boton.click();

    expect(fixture.componentInstance.pulsado).toBe(true);
    expect(boton.getAttribute('aria-disabled')).toBeNull();
  });

  it('sin conexión se ve apagado, dice por qué y el clic no llega', async () => {
    const { fixture, boton } = await render();
    conectado.set(false);
    await fixture.whenStable();

    boton.click();

    expect(fixture.componentInstance.pulsado).toBe(false);
    expect(boton.getAttribute('aria-disabled')).toBe('true');
    expect(boton.title).toBe('El Excel necesita conexión');
  });

  it('también con red pero sin que el servidor conteste, o en modo sin conexión', async () => {
    const { fixture, boton } = await render();
    TestBed.inject(OfflineState).sinRed();
    await fixture.whenStable();

    boton.click();

    expect(fixture.componentInstance.pulsado).toBe(false);
  });
});
