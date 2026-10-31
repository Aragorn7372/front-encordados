import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ToastService } from '../../toast/toast.service';
import { AuthApi } from '../api/auth.api';
import { AuthStore } from './auth.store';
import { fakeToken } from '../jwt/jwt.testing';

describe('AuthStore', () => {
  const api = { signIn: vi.fn(), signUp: vi.fn() };

  const setup = () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthApi, useValue: api }],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    return TestBed.inject(AuthStore);
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('sin token guardado no hay sesión', () => {
    const auth = setup();
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.role()).toBeNull();
  });

  it('recupera la sesión guardada al recargar', () => {
    localStorage.setItem('etr_token', fakeToken('OWNER'));
    const auth = setup();
    expect(auth.role()).toBe('OWNER');
    expect(auth.username()).toBe('rafa');
  });

  it('descarta un token guardado que ya ha caducado', () => {
    localStorage.setItem('etr_token', fakeToken('OWNER', -10));
    expect(setup().isLoggedIn()).toBe(false);
    expect(localStorage.getItem('etr_token')).toBeNull();
  });

  it('no da sesión a un token con un rol desconocido', () => {
    localStorage.setItem('etr_token', fakeToken('jefe_taller' as never));
    expect(setup().isLoggedIn()).toBe(false);
  });

  it('login guarda el token y expone el rol', async () => {
    const token = fakeToken('ENCORDER');
    api.signIn.mockReturnValue(of({ token }));
    const auth = setup();

    await auth.login({ username: 'rafa', password: '123456' });

    expect(auth.hasRole('ENCORDER')).toBe(true);
    expect(auth.hasRole('ADMIN', 'OWNER')).toBe(false);
    expect(localStorage.getItem('etr_token')).toBe(token);
  });

  it('un login fallido propaga el error y no abre sesión', async () => {
    api.signIn.mockReturnValue(throwError(() => ({ status: 401 })));
    const auth = setup();

    await expect(auth.login({ username: 'rafa', password: 'x' })).rejects.toEqual({ status: 401 });
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('logout borra la sesión y vuelve al login', () => {
    localStorage.setItem('etr_token', fakeToken());
    const auth = setup();

    auth.logout();

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('etr_token')).toBeNull();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login']);
  });

  it('avisa 5 minutos antes y cierra la sesión al caducar', () => {
    vi.useFakeTimers();
    localStorage.setItem('etr_token', fakeToken('USER', 600));
    const auth = setup();
    const toast = TestBed.inject(ToastService);
    TestBed.tick();

    vi.advanceTimersByTime(299_000);
    expect(toast.toasts()).toHaveLength(0);
    vi.advanceTimersByTime(2_000);
    expect(toast.toasts()[0].message).toContain('5 minutos');

    vi.advanceTimersByTime(300_000);
    expect(auth.isLoggedIn()).toBe(false);
    expect(toast.toasts().at(-1)?.message).toBe('Tu sesión ha caducado');
  });
});
