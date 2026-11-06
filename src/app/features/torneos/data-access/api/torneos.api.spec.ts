import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { TorneosApi } from './torneos.api';
import { endOfDay } from '../mapper/torneos.mapper';
import { TournamentFormValue } from '../model/torneo.model';

describe('TorneosApi', () => {
  let api: TorneosApi;
  let backend: HttpTestingController;

  const value: TournamentFormValue = {
    name: 'Madrid',
    startDate: '2026-06-01',
    endDate: '2026-06-02',
    ownerId: 'owner-1',
    logo: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TorneosApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('el listado usa pageSize', () => {
    api.list({ page: 1, size: 12 }).subscribe();

    const { request } = backend.expectOne((req) => req.url === '/api/tournaments');
    expect(request.params.get('pageSize')).toBe('12');
    expect(request.params.has('size')).toBe(false);
  });

  it('OWNER crea con owner-create y sin OwnerId', () => {
    api.create(value, false).subscribe();

    const { request } = backend.expectOne('/api/tournaments/owner-create');
    const body = request.body as FormData;
    expect(body.get('Name')).toBe('Madrid');
    expect(body.has('OwnerId')).toBe(false);
  });

  it('ADMIN crea en la ruta general indicando el propietario', () => {
    api.create(value, true).subscribe();

    const { request } = backend.expectOne('/api/tournaments');
    expect((request.body as FormData).get('OwnerId')).toBe('owner-1');
  });

  it('el último día del torneo se envía completo', () => {
    api.create(value, false).subscribe();

    const { request } = backend.expectOne('/api/tournaments/owner-create');
    expect((request.body as FormData).get('EndTournament')).toBe(endOfDay('2026-06-02'));
  });

  it('adjunta el logo solo si hay fichero', () => {
    const logo = new File(['x'], 'logo.png', { type: 'image/png' });
    api.update('1', { ...value, logo }).subscribe();

    const { request } = backend.expectOne('/api/tournaments/1');
    expect((request.body as FormData).get('Logotype')).toBeInstanceOf(File);
  });

  it('quitar un trabajador envía su id como string JSON', () => {
    api.removeWorker('1', 'user-9').subscribe();

    const { request } = backend.expectOne('/api/tournaments/remove-worker/1');
    expect(request.body).toBe('"user-9"');
    expect(request.headers.get('Content-Type')).toBe('application/json');
  });

  it('owners deja solo a los propietarios', async () => {
    const owners = firstValueFrom(api.owners());

    backend
      .expectOne((req) => req.url === '/api/user')
      .flush({
        content: [
          { userId: '1', role: 'OWNER' },
          { userId: '2', role: 'USER' },
        ],
      });

    expect((await owners).map((u) => u.userId)).toEqual(['1']);
  });
});
