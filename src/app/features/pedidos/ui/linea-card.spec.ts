import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Columna, LineaPedido, Pedido, Tarjeta } from '../data-access/model/pedido.model';
import { LineaCard, tonoPedido } from './linea-card';

const pedido = {
  id: 'p1',
  jugador: { username: 'ana', name: 'Ana', imageUrl: '', bonos: 0 },
  encordador: { username: 'carlos', name: 'Carlos', imageUrl: '', bonos: 0 },
  maquina: 'M-1',
  tipo: 'encordado',
  materialPropio: false,
  pago: 'PAID',
} as unknown as Pedido;

const raqueta = {
  id: 'l1',
  tipo: 'encordado',
  estado: 'PENDING',
  fecha: '',
  raqueta: 'Pure Aero',
  nudos: 2,
  logo: false,
  color: '',
  vertical: { cuerda: 'RPM Blast', tension: 25, preestirado: 0 },
  horizontal: { cuerda: '', tension: 25, preestirado: 0 },
} as LineaPedido;

describe('tonoPedido', () => {
  it('el mismo pedido da siempre el mismo tono, entre 0 y 359', () => {
    const tono = tonoPedido('01KS0Q28TE5BA449NS2EVCBTDQ');
    expect(tonoPedido('01KS0Q28TE5BA449NS2EVCBTDQ')).toBe(tono);
    expect(tono).toBeGreaterThanOrEqual(0);
    expect(tono).toBeLessThan(360);
  });

  it('pedidos creados seguidos (ULID casi iguales) no comparten tono', () => {
    const tonos = [
      '01KS0Q28TE5BA449NS2EVCBTDQ',
      '01KS0Q28TE5BA449NS2EVCBTDR',
      '01KS0Q28TF00000000000000AA',
    ].map(tonoPedido);
    expect(new Set(tonos).size).toBe(3);
  });
});

describe('LineaCard', () => {
  let fixture: ComponentFixture<LineaCard>;
  let moves: Columna[];

  const render = async (
    linea: Partial<LineaPedido> = {},
    extra: Partial<Tarjeta> = {},
    { readonly = false, canRepeat = false } = {},
  ) => {
    fixture = TestBed.createComponent(LineaCard);
    fixture.componentRef.setInput('tarjeta', {
      pedido,
      linea: { ...raqueta, ...linea },
      columna: 'pendiente',
      numero: 1,
      total: 1,
      ...extra,
    });
    fixture.componentRef.setInput('readonly', readonly);
    fixture.componentRef.setInput('canRepeat', canRepeat);
    moves = [];
    fixture.componentInstance.moved.subscribe((columna) => moves.push(columna));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('muestra la raqueta, su cordaje y de quién es', async () => {
    const element = await render();

    expect(element.textContent).toContain('Ana');
    expect(element.textContent).toContain('Pure Aero');
    expect(element.textContent).toContain('RPM Blast 25 kg');
    expect(element.textContent).not.toContain('H:');
    expect(element.textContent).toContain('Carlos');
    expect(element.textContent).toContain('M-1');
    expect(element.textContent).toContain('Pagado');
  });

  it('cordaje híbrido: vertical y horizontal', async () => {
    const element = await render({
      horizontal: { cuerda: 'Xcel', tension: 24, preestirado: 10 },
    } as Partial<LineaPedido>);

    expect(element.textContent).toContain('V: RPM Blast 25 kg · H: Xcel 24 kg +10 %');
  });

  it('distingue raquetas del mismo pedido', async () => {
    const element = await render({}, { numero: 2, total: 5 });
    expect(element.textContent).toContain('2/5');
  });

  it('una sola raqueta no lleva numeración ni color', async () => {
    const element = await render();
    expect(element.textContent).not.toContain('1/1');
    expect(element.querySelector<HTMLElement>('article')!.style.borderInlineStartColor).toBe('');
  });

  it('las raquetas de un pedido llevan su color en la franja y en el número', async () => {
    const element = await render({}, { numero: 2, total: 3 });
    const tono = tonoPedido('p1');

    const franja = element.querySelector<HTMLElement>('article')!;
    expect(franja.classList).toContain('border-s-4');
    expect(franja.getAttribute('style')).toContain(`${tono}`);
    expect(
      element.querySelector<HTMLElement>('[data-testid=numero]')!.getAttribute('style'),
    ).toContain(`${tono}`);
  });

  it('el logo muestra su color', async () => {
    const element = await render({ logo: true, color: 'Rojo' } as Partial<LineaPedido>);
    expect(element.textContent).toContain('Logo Rojo');
  });

  it('marca lo urgente con la fecha de la raqueta', async () => {
    const element = await render({ fecha: new Date().toISOString() });
    expect(element.textContent).toContain('Urgente');
  });

  it('un artículo de taller muestra su cantidad', async () => {
    const element = await render({
      tipo: 'taller',
      articulo: 'Overgrip',
      cantidad: 3,
      notas: '',
      cuando: '',
    } as unknown as Partial<LineaPedido>);

    expect(element.textContent).toContain('Overgrip ×3');
  });

  it.each<[Columna, string, Columna]>([
    ['pendiente', 'Empezar', 'proceso'],
    ['proceso', 'Marcar listo', 'listo'],
    ['listo', 'Entregar', 'cerrado'],
  ])('en %s ofrece "%s"', async (columna, label, destino) => {
    const element = await render({}, { columna });

    const button = element.querySelector<HTMLButtonElement>('[data-testid=siguiente]')!;
    expect(button.textContent).toContain(label);
    button.click();
    expect(moves).toEqual([destino]);
  });

  it('pulsar el nombre abre el detalle', async () => {
    const element = await render();
    let opened = 0;
    fixture.componentInstance.opened.subscribe(() => opened++);

    element.querySelector<HTMLButtonElement>('h3 button')!.click();

    expect(opened).toBe(1);
  });

  it('repetir y cancelar sin abrir el detalle', async () => {
    const element = await render({}, {}, { canRepeat: true });
    let repetidos = 0;
    let cancelados = 0;
    fixture.componentInstance.repeat.subscribe(() => repetidos++);
    fixture.componentInstance.cancelRequest.subscribe(() => cancelados++);

    element.querySelector<HTMLButtonElement>('[data-testid=repetir]')!.click();
    element.querySelector<HTMLButtonElement>('[data-testid=cancelar]')!.click();

    expect([repetidos, cancelados]).toEqual([1, 1]);
  });

  it('una raqueta terminada no se puede cancelar', async () => {
    const element = await render({ estado: 'COMPLETED' }, { columna: 'listo' });
    expect(element.querySelector('[data-testid=cancelar]')).toBeNull();
  });

  it('sin permiso para crear no ofrece repetir', async () => {
    const element = await render();
    expect(element.querySelector('[data-testid=repetir]')).toBeNull();
  });

  it('cerrado no ofrece más pasos, pero sí repetir', async () => {
    const element = await render(
      { estado: 'DELIVERED_TOpLAYER' },
      { columna: 'cerrado' },
      { canRepeat: true },
    );
    expect(element.querySelector('[data-testid=siguiente]')).toBeNull();
    expect(element.querySelector('[data-testid=repetir]')).not.toBeNull();
  });

  it('en solo lectura no hay acciones', async () => {
    const element = await render({}, {}, { readonly: true, canRepeat: true });
    expect(element.querySelector('.card-actions button')).toBeNull();
  });
});
