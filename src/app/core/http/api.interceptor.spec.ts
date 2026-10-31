import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../auth/store/auth.store';
import { APP_CONFIG } from '../config/app-config';
import { apiInterceptor } from './api.interceptor';

describe('apiInterceptor', () => {
  const setup = (token: string | null, apiUrl = 'https://api.test') => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiUrl } },
        { provide: AuthStore, useValue: { token: () => token } },
      ],
    });
    return {
      http: TestBed.inject(HttpClient),
      backend: TestBed.inject(HttpTestingController),
    };
  };

  it('añade URL base, Accept y token a las peticiones de la API', () => {
    const { http, backend } = setup('abc');
    http.get('/api/tournaments').subscribe();

    const { request } = backend.expectOne('https://api.test/api/tournaments');
    expect(request.headers.get('Authorization')).toBe('Bearer abc');
    expect(request.headers.get('Accept')).toBe('application/json');
  });

  it('sin sesión no envía Authorization', () => {
    const { http, backend } = setup(null);
    http.get('/api/tournaments').subscribe();

    const { request } = backend.expectOne('https://api.test/api/tournaments');
    expect(request.headers.has('Authorization')).toBe(false);
  });

  it('respeta un Accept propio (descargas)', () => {
    const { http, backend } = setup('abc');
    http.get('/api/export', { headers: { Accept: 'application/zip' } }).subscribe();

    const { request } = backend.expectOne('https://api.test/api/export');
    expect(request.headers.get('Accept')).toBe('application/zip');
  });

  it('no filtra el token a otros dominios ni a ficheros propios', () => {
    const { http, backend } = setup('abc');
    http.get('https://cloudinary.test/foto.png').subscribe();
    http.get('/config.json').subscribe();

    expect(backend.expectOne('https://cloudinary.test/foto.png').request.headers.keys()).toEqual(
      [],
    );
    expect(backend.expectOne('/config.json').request.headers.keys()).toEqual([]);
  });
});
