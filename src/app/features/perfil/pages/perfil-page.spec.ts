import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthApi } from '../../../core/auth/api/auth.api';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { MeDto, MeStore } from '../../../core/auth/store/me.store';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { PerfilApi } from '../data-access/api/perfil.api';
import PerfilPage from './perfil-page';

describe('PerfilPage', () => {
  const datos = signal<MeDto | null>({
    username: 'jugador_juan',
    name: 'Juan Martínez',
    imageUrl: '',
    bonos: 60,
  });
  const auth = {
    username: () => 'jugador_juan',
    role: () => 'USER',
    logout: vi.fn(),
  };
  const me = {
    datos,
    loading: signal(false),
    imagen: () => null,
    nombre: () => datos()?.name ?? 'jugador_juan',
    reload: vi.fn(),
  };
  const api = { update: vi.fn(() => of({})), remove: vi.fn(() => of(undefined)) };
  const authApi = { requestPasswordChange: vi.fn(() => of(undefined)) };
  const confirm = { ask: vi.fn(async () => true) };
  let fixture: ComponentFixture<PerfilPage>;

  const element = () => fixture.nativeElement as HTMLElement;
  const escribir = async (selector: string, valor: string) => {
    const input = element().querySelector<HTMLInputElement>(selector)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const guardar = async () => {
    element()
      .querySelector('app-perfil-form form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  const render = async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: auth },
        { provide: MeStore, useValue: me },
        { provide: PerfilApi, useValue: api },
        { provide: AuthApi, useValue: authApi },
        { provide: ConfirmService, useValue: confirm },
      ],
    });
    fixture = TestBed.createComponent(PerfilPage);
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    datos.set({ username: 'jugador_juan', name: 'Juan Martínez', imageUrl: '', bonos: 60 });
  });

  it('enseña los datos y los bonos', async () => {
    await render();

    expect(element().textContent).toContain('Juan Martínez');
    expect(element().textContent).toMatch(/60[.,]00/);
    expect(element().querySelector<HTMLInputElement>('#perfil-username')!.value).toBe(
      'jugador_juan',
    );
  });

  it('sin cambios no deja guardar', async () => {
    await render();
    const boton = [...element().querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Guardar cambios'),
    )!;
    expect(boton.disabled).toBe(true);
  });

  it('cambiar el nombre guarda y recarga los datos', async () => {
    await render();
    await escribir('#perfil-nombre', 'Juan M.');

    await guardar();

    expect(api.update).toHaveBeenCalled();
    expect(me.reload).toHaveBeenCalled();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('cambiar el username avisa y cierra la sesión', async () => {
    await render();
    await escribir('#perfil-username', 'juan_m');
    expect(element().textContent).toContain('tendrás que volver a entrar');

    await guardar();

    expect(auth.logout).toHaveBeenCalled();
  });

  it('sin datos del backend (SUPERVISOR) se puede editar igual, con el username del token', async () => {
    datos.set(null);
    await render();

    expect(element().querySelector<HTMLInputElement>('#perfil-username')!.value).toBe(
      'jugador_juan',
    );
    expect(element().textContent).not.toContain('Bonos');
  });

  it('pide el enlace para cambiar la contraseña sin decir si el email existe', async () => {
    await render();
    await escribir('[aria-label="Email de tu cuenta"]', 'juan@tenis.com');

    element()
      .querySelectorAll('form')[1]
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    expect(authApi.requestPasswordChange).toHaveBeenCalledWith('juan@tenis.com');
    expect(element().textContent).toContain('Si ese email es el de tu cuenta');
  });

  it('borrar la cuenta pide confirmación y cierra la sesión', async () => {
    await render();

    [...element().querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Borrar mi cuenta')!
      .click();
    await fixture.whenStable();

    expect(confirm.ask).toHaveBeenCalled();
    expect(api.remove).toHaveBeenCalled();
    expect(auth.logout).toHaveBeenCalled();
  });
});
