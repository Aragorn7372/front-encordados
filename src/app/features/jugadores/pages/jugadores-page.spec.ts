import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { ExcelApi } from '../../../core/excel/excel.api';
import { TournamentContext } from '../../../core/tournament-context/tournament-context';
import { Role } from '../../../shared/models/roles';
import { JugadoresApi } from '../data-access/api/jugadores.api';
import { Jugador } from '../data-access/model/jugador.model';
import JugadoresPage from './jugadores-page';

const jugador = (id: string, nombre: string, email: string | null = null): Jugador => ({
  id,
  nombre,
  username: null,
  email,
  bonos: 10,
  imagen: '',
});

describe('JugadoresPage', () => {
  const torneo = signal<string | null>('t1');
  const api = {
    list: vi.fn(() =>
      of({
        jugadores: [jugador('u1', 'Juan Martínez', 'juan@tenis.com'), jugador('u2', 'Ana Pérez')],
        total: 2,
      }),
    ),
    remove: vi.fn(() => of(undefined)),
  };
  const confirm = { ask: vi.fn(async () => true) };
  let fixture: ComponentFixture<JugadoresPage>;

  const element = () => fixture.nativeElement as HTMLElement;
  const filas = () => [...element().querySelectorAll('tbody tr')].map((tr) => tr.textContent ?? '');
  const boton = (texto: string) =>
    [...element().querySelectorAll('button')].find((b) => b.textContent?.includes(texto));

  const render = async (rol: Role = 'OWNER') => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: JugadoresApi, useValue: api },
        { provide: ExcelApi, useValue: {} },
        { provide: TournamentContext, useValue: { selectedId: torneo } },
        { provide: ConfirmService, useValue: confirm },
        { provide: AuthStore, useValue: { hasRole: (...roles: Role[]) => roles.includes(rol) } },
      ],
    });
    fixture = TestBed.createComponent(JugadoresPage);
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    torneo.set('t1');
  });

  it('lista los jugadores del torneo activo', async () => {
    await render();

    expect(api.list).toHaveBeenCalledWith('t1');
    expect(filas()).toHaveLength(2);
    expect(filas()[0]).toContain('juan@tenis.com');
    expect(filas()[1]).toContain('Sin email');
  });

  it('sin torneo pide elegirlo y no deja crear', async () => {
    torneo.set(null);
    await render();

    expect(element().textContent).toContain('Selecciona un torneo');
    expect(api.list).not.toHaveBeenCalled();
    expect(boton('Nuevo jugador')!.disabled).toBe(true);
  });

  it('busca en el cliente sin distinguir acentos ni mayúsculas', async () => {
    await render();
    const search = element().querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'MARTINEZ';
    search.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 400));
    await fixture.whenStable();

    expect(filas()).toHaveLength(1);
    expect(filas()[0]).toContain('Juan Martínez');
    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('ENCORDER crea jugadores, pero no toca bonos, Excel ni edición', async () => {
    await render('ENCORDER');

    expect(boton('Nuevo jugador')).toBeDefined();
    expect(boton('+ Bonos')).toBeUndefined();
    expect(boton('Exportar Excel')).toBeUndefined();
    expect(boton('Editar')).toBeUndefined();
  });

  it('OWNER añade bonos y usa el Excel, pero no edita ni borra', async () => {
    await render('OWNER');

    expect(boton('+ Bonos')).toBeDefined();
    expect(boton('Exportar Excel')).toBeDefined();
    expect(boton('Editar')).toBeUndefined();
    expect(boton('Borrar')).toBeUndefined();
  });

  it('ADMIN borra, con confirmación, y la lista se recarga', async () => {
    await render('ADMIN');

    boton('Borrar')!.click();
    await fixture.whenStable();

    expect(confirm.ask).toHaveBeenCalled();
    expect(api.remove).toHaveBeenCalledWith('u1');
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('«+ Bonos» abre el formulario de ese jugador', async () => {
    await render('OWNER');

    boton('+ Bonos')!.click();
    await fixture.whenStable();

    const dialog = element().querySelector('dialog[open]')!;
    expect(dialog.textContent).toContain('Añadir bonos');
    expect(dialog.textContent).toMatch(/10[.,]00/);
  });

  it('copia los contactos filtrados', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await render();

    boton('Copiar contactos')!.click();
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith('Juan Martínez <juan@tenis.com>\nAna Pérez');
  });
});
