import { ComponentFixture, TestBed } from '@angular/core/testing';
import { nivelStock } from '../models/stock';
import { StockControl } from './stock-control';

describe('nivelStock', () => {
  it.each([
    [0, 'agotado'],
    [-1, 'agotado'],
    [1, 'bajo'],
    [5, 'bajo'],
    [6, 'ok'],
  ])('%i → %s', (stock, nivel) => {
    expect(nivelStock(stock)).toBe(nivel);
  });
});

describe('StockControl', () => {
  let fixture: ComponentFixture<StockControl>;
  let cambios: number[];
  const element = () => fixture.nativeElement as HTMLElement;

  const render = async (stock: number, disabled = false) => {
    fixture = TestBed.createComponent(StockControl);
    fixture.componentRef.setInput('stock', stock);
    fixture.componentRef.setInput('nombre', 'RPM Blast');
    fixture.componentRef.setInput('disabled', disabled);
    cambios = [];
    fixture.componentInstance.cambio.subscribe((c) => cambios.push(c));
    await fixture.whenStable();
  };
  const boton = (label: string) =>
    element().querySelector<HTMLButtonElement>(`[aria-label^="${label}"]`)!;

  it('emite +1 y −1', async () => {
    await render(10);
    boton('Añadir').click();
    boton('Quitar').click();
    expect(cambios).toEqual([1, -1]);
  });

  it('avisa del stock bajo y de agotado', async () => {
    await render(3);
    expect(element().querySelector('.badge')!.getAttribute('aria-label')).toContain('Stock bajo');
    await render(0);
    expect(element().querySelector('.badge')!.getAttribute('aria-label')).toContain('Agotado');
  });

  it('sin stock no deja quitar, y desactivado no deja nada', async () => {
    await render(0);
    expect(boton('Quitar').disabled).toBe(true);
    await render(10, true);
    expect(boton('Añadir').disabled).toBe(true);
  });
});
