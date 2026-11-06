import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SILENT_ERRORS } from '../http/error.interceptor';
import { ExcelApi } from './excel.api';
import { resumenImportacion } from './excel.model';

describe('ExcelApi', () => {
  let api: ExcelApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ExcelApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('exporta con la exportación avanzada, varias hojas, y acepta errores en JSON', () => {
    api.exportar('t1', ['users', 'pedidos']).subscribe();

    const { request } = backend.expectOne((req) => req.url === '/api/excel/advanced/export');
    expect(request.params.get('tournamentId')).toBe('t1');
    expect(request.params.get('types')).toBe('users,pedidos');
    expect(request.responseType).toBe('blob');
    expect(request.headers.get('Accept')).toContain('application/json');
  });

  it('importa el fichero en el campo «file», sin redirigir si responde 403', () => {
    api.importar('t1', ['users'], new File(['x'], 'jugadores.xlsx')).subscribe();

    const { request } = backend.expectOne((req) => req.url === '/api/excel/advanced/import');
    expect(request.method).toBe('POST');
    expect(request.params.get('types')).toBe('users');
    expect((request.body as FormData).get('file')).toBeInstanceOf(File);
    expect(request.context.get(SILENT_ERRORS)).toBe(true);
  });
});

describe('resumenImportacion', () => {
  it('solo cuenta lo que ha cambiado', () => {
    expect(
      resumenImportacion({
        usersCreated: 3,
        usersUpdated: 0,
        materialsCreated: 0,
        materialsUpdated: 0,
        cuerdasCreated: 0,
        cuerdasUpdated: 2,
        tournamentsCreated: 0,
        tournamentsUpdated: 0,
        pedidosCreated: 0,
        pedidosUpdated: 0,
        pedidosLineasUpdated: 0,
        errors: [],
      }),
    ).toEqual(['3 jugadores creados', '2 cordajes actualizados']);
  });
});
