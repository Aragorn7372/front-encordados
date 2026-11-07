import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PwaService } from '../pwa/pwa.service';
import { OfflineState } from './offline-state';
import { SinDatos } from './sin-datos';

describe('OfflineState', () => {
  const reload = vi.fn();
  const setup = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          // Solo usa defaultView.location.reload: un documento de mentira basta
          useValue: { defaultView: { location: { reload } } },
        },
      ],
    });
    return TestBed.inject(OfflineState);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('etr_sin_conexion');
  });

  it('el modo sin conexión elegido se recuerda al volver a abrir', () => {
    setup().setModoSinConexion(true);
    expect(localStorage.getItem('etr_sin_conexion')).toBe('1');

    TestBed.resetTestingModule();
    expect(setup().modoSinConexion()).toBe(true);
  });

  it('«Conectar» lo olvida y recarga para pedir datos frescos', () => {
    const estado = setup();
    estado.setModoSinConexion(true);

    estado.setModoSinConexion(false);

    expect(localStorage.getItem('etr_sin_conexion')).toBeNull();
    expect(reload).toHaveBeenCalled();
    // Al recargar, la página nueva arranca ya conectada
    TestBed.resetTestingModule();
    expect(setup().modoSinConexion()).toBe(false);
  });

  it('la página que se va a recargar no se conecta: empezaría a enviar la cola dos veces', () => {
    const estado = setup();
    estado.setModoSinConexion(true);

    estado.setModoSinConexion(false);

    expect(estado.modoSinConexion()).toBe(true);
  });

  it('de varias copias, se recuerda la más antigua', () => {
    const estado = setup();
    estado.servidaCopia(3000);
    estado.servidaCopia(1000);
    estado.servidaCopia(2000);
    expect(estado.copiaDel()).toBe(1000);

    estado.conectado();
    expect([estado.copiaDel(), estado.sinServidor()]).toEqual([null, false]);
  });
});

describe('SinDatos', () => {
  const render = async (modo: boolean, conectado: boolean) => {
    TestBed.configureTestingModule({});
    TestBed.inject(OfflineState).modoSinConexion.set(modo);
    TestBed.inject(PwaService).conectado.set(conectado);
    const fixture = TestBed.createComponent(SinDatos);
    fixture.componentRef.setInput('que', 'pedidos');
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  };

  it('con conexión: un error normal', async () => {
    expect(await render(false, true)).toContain('No se han podido cargar los pedidos');
  });

  it('sin conexión: hace falta abrirlo una vez con conexión', async () => {
    const texto = await render(false, false);
    expect(texto).toContain('Necesitas conexión para ver esto');
    expect(texto).toContain('Todavía no hay pedidos guardados');
  });

  it('en modo sin conexión: no está guardado, y ofrece usar la conexión', async () => {
    const texto = await render(true, true);
    expect(texto).toContain('no hay pedidos guardados');
    expect(texto).toContain('Usar la conexión');
  });
});
