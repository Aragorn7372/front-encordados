import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { PedidosApi } from '../data-access/api/pedidos.api';
import { PedidoForm } from './pedido-form';

describe('PedidoForm', () => {
  const api = {
    datosNuevoPedido: vi.fn(() =>
      of({
        jugadores: [{ username: 'ana', name: 'Ana', bonos: 0 }],
        encordadores: [
          { username: 'carlos', name: 'Carlos', maquina: 'Babolat Star 5' },
          { username: 'maria', name: 'María', maquina: 'Wilson Baiardo' },
          { username: 'luis', name: 'Luis', maquina: null },
        ],
      }),
    ),
  };
  let fixture: ComponentFixture<PedidoForm>;

  const element = () => fixture.nativeElement as HTMLElement;
  const maquina = () => element().querySelector<HTMLInputElement>('#pedido-maquina')!;

  const elegirEncordador = async (username: string) => {
    const select = element().querySelector<HTMLSelectElement>('#pedido-encordador')!;
    select.value = username;
    select.dispatchEvent(new Event('input'));
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  const escribirMaquina = async (valor: string) => {
    maquina().value = valor;
    maquina().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PedidosApi, useValue: api },
        {
          provide: AuthStore,
          useValue: {
            hasRole: (...roles: string[]) => roles.includes('OWNER'),
            username: () => 'o',
          },
        },
      ],
    });
    fixture = TestBed.createComponent(PedidoForm);
    fixture.componentRef.setInput('tournamentId', 't1');
    await fixture.whenStable();
  });

  it('al elegir encordador se pone su máquina', async () => {
    await elegirEncordador('carlos');

    expect(maquina().value).toBe('Babolat Star 5');
  });

  it('la máquina se puede cambiar a mano y se mantiene', async () => {
    await elegirEncordador('carlos');
    await escribirMaquina('Otra');

    expect(maquina().value).toBe('Otra');
  });

  it('elegir otro encordador pone la suya, aunque se hubiera cambiado a mano', async () => {
    await elegirEncordador('carlos');
    await escribirMaquina('Otra');
    await elegirEncordador('maria');

    expect(maquina().value).toBe('Wilson Baiardo');
  });

  const boton = (texto: string) =>
    [...element().querySelectorAll('button')].filter((b) => b.textContent?.includes(texto));

  it('el color solo se pide con logo', async () => {
    expect(element().querySelector('#linea-color-0')).toBeNull();

    // La última casilla es «Con logo»; la primera, «material propio»
    const conLogo = [...element().querySelectorAll<HTMLInputElement>('input[type=checkbox]')].at(
      -1,
    )!;
    conLogo.click();
    await fixture.whenStable();

    expect(element().querySelector('#linea-color-0')).not.toBeNull();
  });

  it('desde la segunda raqueta se puede poner otra fecha', async () => {
    expect(boton('Otra fecha')).toHaveLength(0);

    boton('Añadir raqueta')[0].click();
    await fixture.whenStable();
    boton('Otra fecha')[0].click();
    await fixture.whenStable();

    const fecha = element().querySelector<HTMLInputElement>(
      '[aria-label="Fecha de la raqueta 2"]',
    )!;
    expect(fecha.value).toBe(element().querySelector<HTMLInputElement>('#pedido-fecha')!.value);

    boton('Usar la del pedido')[0].click();
    await fixture.whenStable();
    expect(element().querySelector('[aria-label="Fecha de la raqueta 2"]')).toBeNull();
  });

  it('el botón dice cuántas raquetas se crearán', async () => {
    const cantidad = element().querySelector<HTMLInputElement>('#linea-cantidad-0')!;
    cantidad.value = '5';
    cantidad.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(boton('Crear pedido')[0].textContent).toContain('5 raquetas');
  });

  it('un encordador sin máquina quita la del anterior', async () => {
    await elegirEncordador('maria');
    await elegirEncordador('luis');

    expect(maquina().value).toBe('');
  });

  it('un encordador sin máquina no borra la escrita', async () => {
    await escribirMaquina('Propia');
    await elegirEncordador('luis');

    expect(maquina().value).toBe('Propia');
  });
});
