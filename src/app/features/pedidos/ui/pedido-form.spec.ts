import { WritableSignal } from '@angular/core';
import { Operacion } from '../../../core/offline/outbox';
import { OutboxService } from '../../../core/offline/outbox.service';
import { OP_CONTACTO_CREAR } from '../../../shared/models/contacto-pendiente';
import { provideOutboxDirecto } from '../../../core/offline/outbox.testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideEscriturasDirectas } from '../data-access/store/pedidos-escrituras.testing';
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
        provideEscriturasDirectas(api),
        provideOutboxDirecto(),
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

  it('se puede elegir un jugador creado sin conexión que aún no se ha enviado', async () => {
    const pendientes = TestBed.inject(OutboxService).pendientes as WritableSignal<Operacion[]>;
    pendientes.set([
      {
        id: 1,
        tipo: OP_CONTACTO_CREAR,
        payload: {
          tempId: 'tmp-9',
          request: { name: 'Luis', email: null, phone: null, tournamentId: 't1' },
        },
        descripcion: '',
        creadaEn: 0,
        estado: 'pendiente',
        intentos: 0,
      },
    ]);
    await fixture.whenStable();

    const opciones = [...element().querySelectorAll('#pedido-jugador option')];
    expect(opciones.find((o) => o.textContent?.includes('Luis'))?.getAttribute('value')).toBe(
      'tmp-9',
    );
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

describe('PedidoForm como ENCORDER', () => {
  const api = {
    // Sin /workers: el ENCORDER no puede leerlo, así que no hay máquinas
    datosNuevoPedido: vi.fn(() =>
      of({
        jugadores: [{ username: 'ana', name: 'Ana', bonos: 0 }],
        encordadores: [
          { username: 'carlos', name: 'Carlos', maquina: null },
          { username: 'maria', name: 'María', maquina: null },
        ],
      }),
    ),
    create: vi.fn((request: unknown) => of({ id: 'p1', request })),
  };
  let fixture: ComponentFixture<PedidoForm>;

  const element = () => fixture.nativeElement as HTMLElement;
  const campo = <T extends HTMLElement>(selector: string) => element().querySelector<T>(selector)!;
  const poner = async (selector: string, valor: string, evento = 'input') => {
    const control = campo<HTMLInputElement>(selector);
    control.value = valor;
    control.dispatchEvent(new Event(evento));
    if (selector === '#pedido-encordador') control.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.setItem('etr_maquina:t1', 'Mi máquina');
    TestBed.configureTestingModule({
      providers: [
        { provide: PedidosApi, useValue: api },
        provideEscriturasDirectas(api),
        provideOutboxDirecto(),
        {
          provide: AuthStore,
          useValue: {
            hasRole: (...roles: string[]) => roles.includes('ENCORDER'),
            username: () => 'carlos',
          },
        },
      ],
    });
    fixture = TestBed.createComponent(PedidoForm);
    fixture.componentRef.setInput('tournamentId', 't1');
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('etr_maquina:t1'));

  it('elige entre todos los encordadores, empezando por él con su máquina', async () => {
    expect(api.datosNuevoPedido).toHaveBeenCalledWith('t1', false);
    const opciones = [...element().querySelectorAll('#pedido-encordador option')].map(
      (o) => (o as HTMLOptionElement).value,
    );
    expect(opciones).toEqual(['', 'carlos', 'maria']);
    expect(campo<HTMLSelectElement>('#pedido-encordador').value).toBe('carlos');
    expect(campo<HTMLInputElement>('#pedido-maquina').value).toBe('Mi máquina');
  });

  it('al asignarlo a otro se quita su máquina, y vuelve si se elige otra vez', async () => {
    await poner('#pedido-encordador', 'maria');
    expect(campo<HTMLInputElement>('#pedido-maquina').value).toBe('');

    await poner('#pedido-encordador', 'carlos');
    expect(campo<HTMLInputElement>('#pedido-maquina').value).toBe('Mi máquina');
  });

  it('un pedido para otro no cambia la máquina que tiene guardada', async () => {
    await poner('#pedido-jugador', 'ana');
    await poner('#pedido-encordador', 'maria');
    await poner('#pedido-maquina', 'Máquina de María');
    await poner('#linea-raqueta-0', 'Pure Aero');
    await poner('#linea-cuerdav-0', 'RPM');

    campo('form').dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ assignedToName: 'maria' }));
    expect(localStorage.getItem('etr_maquina:t1')).toBe('Mi máquina');
  });
});
