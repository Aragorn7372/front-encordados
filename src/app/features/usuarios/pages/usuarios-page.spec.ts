import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { Role } from '../../../shared/models/roles';
import { UsuariosApi } from '../data-access/api/usuarios.api';
import { Usuario } from '../data-access/model/usuario.model';
import UsuariosPage from './usuarios-page';

const usuario = (
  id: string,
  nombre: string,
  rol: Role,
  torneoId: string | null = null,
): Usuario => ({
  id,
  nombre,
  username: id,
  email: `${id}@x.com`,
  rol,
  torneoId,
  imagen: '',
});

describe('UsuariosPage', () => {
  const api = {
    list: vi.fn(() =>
      of({
        usuarios: [
          usuario('admin', 'Admin', 'ADMIN'),
          usuario('owner', 'Owner', 'OWNER'),
          usuario('carlos', 'Carlos', 'ENCORDER'),
          usuario('luis', 'Luis', 'SUPERVISOR'),
          usuario('nuevo', 'Nueva Cuenta', 'USER'),
          usuario('juan', 'Juan Jugador', 'USER', 't1'),
        ],
        total: 6,
      }),
    ),
    hacerEncordador: vi.fn(() => of(undefined)),
    remove: vi.fn(() => of(undefined)),
  };
  const confirm = { ask: vi.fn(async () => true) };
  let fixture: ComponentFixture<UsuariosPage>;

  const element = () => fixture.nativeElement as HTMLElement;
  const filas = () => [...element().querySelectorAll('tbody tr')].map((tr) => tr.textContent ?? '');
  const pestana = async (nombre: string) => {
    [...element().querySelectorAll<HTMLButtonElement>('[role=tab]')]
      .find((b) => b.textContent?.includes(nombre))!
      .click();
    await fixture.whenStable();
  };
  const pestanas = () =>
    [...element().querySelectorAll('[role=tab]')].map((b) =>
      (b.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );
  const boton = (label: string) =>
    element().querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);

  const render = async (rol: Role, userId = 'admin') => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: UsuariosApi, useValue: api },
        { provide: ConfirmService, useValue: confirm },
        {
          provide: AuthStore,
          useValue: {
            role: () => rol,
            userId: () => userId,
            hasRole: (...roles: Role[]) => roles.includes(rol),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(UsuariosPage);
    await fixture.whenStable();
  };

  beforeEach(() => vi.clearAllMocks());

  it('pagina de 20 en 20; buscar vuelve a la primera página', async () => {
    const muchos = Array.from({ length: 45 }, (_, i) =>
      usuario(
        `enc${String(i).padStart(2, '0')}`,
        `Encordador ${String(i).padStart(2, '0')}`,
        'ENCORDER',
      ),
    );
    api.list.mockReturnValueOnce(of({ usuarios: muchos, total: 45 }));
    await render('ADMIN');

    expect(filas()).toHaveLength(20);
    expect(element().textContent).toContain('Página 1 de 3');
    expect(filas()[0]).toContain('Encordador 00');

    [...element().querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Siguiente'))!
      .click();
    await fixture.whenStable();
    expect(element().textContent).toContain('Página 2 de 3');
    expect(filas()[0]).toContain('Encordador 20');

    // La búsqueda filtra sobre todas las cuentas y vuelve a la primera página
    const buscar = element().querySelector<HTMLInputElement>('input[type=search]')!;
    buscar.value = 'Encordador 44';
    buscar.dispatchEvent(new Event('input'));
    await new Promise((ok) => setTimeout(ok, 400)); // el buscador espera a que se deje de escribir
    await fixture.whenStable();
    expect(filas()).toHaveLength(1);
    expect(filas()[0]).toContain('Encordador 44');
    expect(element().textContent).not.toContain('Página');
  });

  it('se mira un tipo cada vez: pestañas con su número, empezando por encordadores', async () => {
    await render('ADMIN');

    expect(pestanas()).toEqual([
      'Encordadores 1',
      'Supervisores 1',
      'Jugadores 1',
      'Sin rol 1',
      'Propietarios 2',
    ]);
    expect(filas()).toHaveLength(1);
    expect(filas()[0]).toContain('Carlos');

    await pestana('Propietarios');
    expect(filas().join(' ')).toContain('Admin');
    expect(filas().join(' ')).toContain('Owner');
  });

  it('el ADMIN ve el backup y «Dar rol» en la cuenta sin rol', async () => {
    await render('ADMIN');
    await pestana('Sin rol');

    expect(boton('Dar rol a Nueva Cuenta')).not.toBeNull();
    expect(element().querySelector('app-backup-panel')).not.toBeNull();
  });

  it('el ADMIN no puede borrarse a sí mismo', async () => {
    await render('ADMIN', 'admin');
    expect(boton('Borrar a Carlos')).not.toBeNull();

    await pestana('Propietarios');
    expect(boton('Borrar a Admin')).toBeNull();
    expect(boton('Borrar a Owner')).not.toBeNull();
  });

  it('el OWNER ve encordadores, supervisores, jugadores y sin rol (no propietarios), sin backup ni borrar', async () => {
    await render('OWNER', 'owner');

    expect(pestanas().map((p) => p.replace(/ \d+$/, ''))).toEqual([
      'Encordadores',
      'Supervisores',
      'Jugadores',
      'Sin rol',
    ]);
    await pestana('Jugadores');
    expect(filas().join(' ')).toContain('Juan Jugador');
    expect(element().querySelector('app-backup-panel')).toBeNull();
    expect(boton('Borrar a Juan Jugador')).toBeNull();
  });

  it('el OWNER hace encordador a una cuenta sin rol, con confirmación', async () => {
    await render('OWNER', 'owner');
    await pestana('Sin rol');

    boton('Hacer encordador a Nueva Cuenta')!.click();
    await fixture.whenStable();

    expect(confirm.ask).toHaveBeenCalled();
    expect(api.hacerEncordador).toHaveBeenCalledWith('nuevo');
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('avisa de las cuentas que esperan rol', async () => {
    await render('ADMIN');
    expect(element().querySelector('[role=status]')!.textContent).toContain('1 cuenta espera');
  });
});
