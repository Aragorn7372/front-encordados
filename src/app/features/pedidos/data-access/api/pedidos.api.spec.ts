import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PedidosApi } from './pedidos.api';

describe('PedidosApi', () => {
  let api: PedidosApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PedidosApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('filtra por torneo', () => {
    api.list('t1').subscribe();

    const { request } = backend.expectOne((req) => req.url === '/api/purchased');
    expect(request.params.get('tournamentId')).toBe('t1');
    expect(request.params.has('search')).toBe(false); // Hoy el backend responde 500
    expect(request.params.get('size')).toBe('200');
  });

  it('sin torneo no envía el parámetro', () => {
    api.list(null).subscribe();

    const { request } = backend.expectOne((req) => req.url === '/api/purchased');
    expect(request.params.has('tournamentId')).toBe(false);
  });

  const pedido = {
    id: 'p1',
    maquina: 'M-1',
    pago: 'PENDING_PAYMENT',
    comentarios: 'Suave',
    materialPropio: true,
  } as never;

  it('al editar solo envía lo que cambia', () => {
    api.update(pedido, { maquina: 'M-1', pago: 'PAID', comentarios: 'Suave' }).subscribe();

    const { request } = backend.expectOne('/api/purchased/p1');
    expect(request.method).toBe('PUT');
    expect(request.body).toEqual({ payStatus: 'PAID' });
  });

  it('al editar comentarios conserva la marca de material propio', () => {
    api
      .update(pedido, { maquina: 'M-1', pago: 'PENDING_PAYMENT', comentarios: 'Fuerte' })
      .subscribe();

    const { request } = backend.expectOne('/api/purchased/p1');
    expect(request.body).toEqual({ comments: '[MATERIAL PROPIO] Fuerte' });
  });

  it('cambia el estado de una línea con un string JSON', () => {
    api.changeLineStatus('l1', 'IN_PROGRESS').subscribe();

    const { request } = backend.expectOne('/api/purchased/lineas/l1/status');
    expect(request.method).toBe('PATCH');
    expect(request.body).toBe('"IN_PROGRESS"');
  });

  it('exporta pedidos con la exportación avanzada y acepta errores en JSON', () => {
    api.exportPedidos('t1').subscribe();

    const { request } = backend.expectOne((req) => req.url === '/api/excel/advanced/export');
    expect(request.params.get('tournamentId')).toBe('t1');
    expect(request.params.get('types')).toBe('pedidos');
    expect(request.responseType).toBe('blob');
    expect(request.headers.get('Accept')).toContain('application/json');
  });
});
