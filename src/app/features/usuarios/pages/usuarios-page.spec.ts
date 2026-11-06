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

  it('el ADMIN ve todas las cuentas, el backup y «Dar rol» en la cuenta sin rol', async () => {
    await render('ADMIN');

    expect(filas()).toHaveLength(6);
    expect(boton('Dar rol a Nueva Cuenta')).not.toBeNull();
    expect(boton('Dar rol a Carlos')).toBeNull();
    expect(element().querySelector('app-backup-panel')).not.toBeNull();
  });

  it('el ADMIN no puede borrarse a sí mismo', async () => {
    await render('ADMIN', 'admin');

    expect(boton('Borrar a Admin')).toBeNull();
    expect(boton('Borrar a Carlos')).not.toBeNull();
  });

  it('el OWNER solo ve su equipo y las cuentas sin rol, sin backup ni borrar', async () => {
    await render('OWNER', 'owner');

    const texto = filas().join(' ');
    expect(filas()).toHaveLength(3);
    expect(texto).toContain('Carlos');
    expect(texto).toContain('Luis');
    expect(texto).toContain('Nueva Cuenta');
    expect(texto).not.toContain('Admin');
    expect(texto).not.toContain('Juan Jugador');
    expect(element().querySelector('app-backup-panel')).toBeNull();
    expect(boton('Borrar a Carlos')).toBeNull();
  });

  it('el OWNER hace encordador a una cuenta sin rol, con confirmación', async () => {
    await render('OWNER', 'owner');

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
