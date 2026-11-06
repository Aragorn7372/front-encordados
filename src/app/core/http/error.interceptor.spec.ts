import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { errorInterceptor, SILENT_ERRORS } from './error.interceptor';
import { ToastService } from '../toast/toast.service';
import { AppError } from './app-error';
import { AuthStore } from '../auth/store/auth.store';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let toast: ToastService;
  const auth = { isLoggedIn: vi.fn(() => false), logout: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(), // ← el backend falso; SIEMPRE después de provideHttpClient
        provideRouter([]),
        { provide: AuthStore, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => backend.verify()); // falla si quedó alguna petición sin responder

  it('en un 400 muestra un toast con el mensaje y reenvía el AppError', async () => {
    const promesa = firstValueFrom(http.get('/api/test'));

    backend
      .expectOne('/api/test')
      .flush({ message: 'Datos inválidos' }, { status: 400, statusText: 'Bad Request' });

    await expect(promesa).rejects.toMatchObject<Partial<AppError>>({
      status: 400,
      message: 'Datos inválidos',
    });
    expect(toast.toasts()).toHaveLength(1);
    expect(toast.toasts()[0].type).toBe('error');
  });

  it('en un 400 con SILENT_ERRORS no muestra un toast', async () => {
    const promesa = firstValueFrom(
      http.get('/api/test', { context: new HttpContext().set(SILENT_ERRORS, true) }),
    );

    backend
      .expectOne('/api/test')
      .flush({ message: 'Datos inválidos' }, { status: 400, statusText: 'Bad Request' });

    await expect(promesa).rejects.toMatchObject<Partial<AppError>>({
      status: 400,
      message: 'Datos inválidos',
    });
    expect(toast.toasts()).toHaveLength(0);
  });

  it('un 401 con sesión abierta cierra la sesión sin toast de error', async () => {
    auth.isLoggedIn.mockReturnValueOnce(true);
    const promesa = firstValueFrom(http.get('/api/test'));

    backend.expectOne('/api/test').flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(promesa).rejects.toMatchObject<Partial<AppError>>({ status: 401 });
    expect(auth.logout).toHaveBeenCalledWith('Tu sesión ha caducado');
    expect(toast.toasts()).toHaveLength(0);
  });

  it('un 401 sin sesión (credenciales incorrectas) no hace logout', async () => {
    const promesa = firstValueFrom(http.get('/api/test'));

    backend.expectOne('/api/test').flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(promesa).rejects.toMatchObject<Partial<AppError>>({ status: 401 });
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('en un 403 navega a /403 y no muestra toast', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const promesa = firstValueFrom(http.get('/api/test'));

    backend
      .expectOne('/api/test')
      .flush({ message: 'Acceso no autorizado' }, { status: 403, statusText: 'Forbidden' });

    await expect(promesa).rejects.toMatchObject<Partial<AppError>>({ status: 403 });
    expect(navigate).toHaveBeenCalledWith(['/403']);
    expect(toast.toasts()).toHaveLength(0);
  });

  it('en un 403 con SILENT_ERRORS no navega: el componente muestra el mensaje', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const promesa = firstValueFrom(
      http.get('/api/test', { context: new HttpContext().set(SILENT_ERRORS, true) }),
    );

    backend
      .expectOne('/api/test')
      .flush({ message: 'No tienes permisos' }, { status: 403, statusText: 'Forbidden' });

    await expect(promesa).rejects.toMatchObject<Partial<AppError>>({
      status: 403,
      message: 'No tienes permisos',
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(toast.toasts()).toHaveLength(0);
  });

  it('una petición correcta pasa sin tocarla y sin toast', async () => {
    const promesa = firstValueFrom(http.get('/api/test'));

    backend.expectOne('/api/test').flush({ ok: true });

    await expect(promesa).resolves.toEqual({ ok: true });
    expect(toast.toasts()).toHaveLength(0);
  });

  it('error de red: toast "Sin conexión" y reenvía el AppError con status 0', async () => {
    const promesa = firstValueFrom(http.get('/api/test'));

    backend.expectOne('/api/test').error(new ProgressEvent('error'));

    await expect(promesa).rejects.toMatchObject<Partial<AppError>>({
      status: 0,
      message: 'Sin conexión con el servidor',
    });
    expect(toast.toasts()[0].message).toBe('Sin conexión con el servidor');
  });
});
