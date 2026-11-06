import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LineaPedido } from '../data-access/model/pedido.model';
import { CambioLinea, PedidoLineas } from './pedido-lineas';

const encordado = {
  id: 'l1',
  tipo: 'encordado',
  estado: 'PENDING',
  fecha: '',
  raqueta: 'Pure Aero',
  nudos: 2,
  logo: true,
  color: 'Azul',
  vertical: { cuerda: 'RPM', tension: 25, preestirado: 5 },
  horizontal: { cuerda: '', tension: 24, preestirado: 0 },
} as LineaPedido;

const taller = {
  id: 'l2',
  tipo: 'taller',
  estado: 'CANCELED',
  fecha: '',
  articulo: 'Overgrip',
  cantidad: 3,
  notas: 'negro',
  cuando: '',
} as LineaPedido;

describe('PedidoLineas', () => {
  let fixture: ComponentFixture<PedidoLineas>;
  let cambios: CambioLinea[];

  const render = async (canManage: boolean) => {
    fixture = TestBed.createComponent(PedidoLineas);
    fixture.componentRef.setInput('lineas', [encordado, taller]);
    fixture.componentRef.setInput('canManage', canManage);
    cambios = [];
    fixture.componentInstance.changed.subscribe((c) => cambios.push(c));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('muestra el cordaje y, si falta el horizontal, repite el vertical', async () => {
    const element = await render(false);

    expect(element.textContent).toContain('V: RPM · 25 kg · 5%');
    expect(element.textContent).toContain('H: RPM · 24 kg');
  });

  it('muestra los artículos de taller', async () => {
    const element = await render(false);
    expect(element.textContent).toContain('3 × Overgrip');
  });

  it('en solo lectura no hay selectores', async () => {
    const element = await render(false);
    expect(element.querySelector('select')).toBeNull();
  });

  it('una línea cancelada no se puede cambiar', async () => {
    const element = await render(true);
    expect(element.querySelectorAll('select')).toHaveLength(1);
  });

  it('el selector no ofrece cancelar: tiene su propia acción', async () => {
    const element = await render(true);
    const opciones = [...element.querySelectorAll('option')].map((o) => o.value);
    expect(opciones).not.toContain('CANCELED');
  });

  it('cambiar el estado lo emite y se puede deshacer', async () => {
    const element = await render(true);
    const select = element.querySelector('select')!;

    select.value = 'COMPLETED';
    select.dispatchEvent(new Event('change'));

    expect(cambios[0]).toMatchObject({ estado: 'COMPLETED' });
    cambios[0].revertir();
    expect(select.value).toBe('PENDING');
  });
});
