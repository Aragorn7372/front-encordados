import { Component, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { Role } from '../../../shared/models/roles';
import { CamaraEscaner } from '../ui/camara-escaner';
import EscanerPage from './escaner-page';

/** La cámara de verdad se prueba en el E2E: aquí solo importa qué hace la página con lo leído. */
@Component({ selector: 'app-camara-escaner', template: '' })
class CamaraFalsa {
  readonly leido = output<string>();
}

const ID = '01KS0Q28TEJ0SYA6JJ5H4W4CMP';

describe('EscanerPage', () => {
  const navigate = vi.fn(async () => true);

  const render = async (rol: Role, codigo?: string) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: AuthStore, useValue: { role: () => rol } },
      ],
    });
    TestBed.overrideComponent(EscanerPage, {
      remove: { imports: [CamaraEscaner] },
      add: { imports: [CamaraFalsa] },
    });
    const fixture = TestBed.createComponent(EscanerPage);
    if (codigo) fixture.componentRef.setInput('codigo', codigo);
    await fixture.whenStable();
    const camara = fixture.debugElement.query((d) => d.componentInstance instanceof CamaraFalsa)
      .componentInstance as CamaraFalsa;
    return { fixture, camara, element: fixture.nativeElement as HTMLElement };
  };

  beforeEach(() => vi.clearAllMocks());

  it('un código leído por la cámara abre su pedido en el tablero', async () => {
    const { camara } = await render('OWNER');

    camara.leido.emit(ID);

    expect(navigate).toHaveBeenCalledWith(['/pedidos'], { queryParams: { openPedido: ID } });
  });

  it('cada rol lo abre donde ve sus pedidos', async () => {
    const { camara } = await render('ENCORDER');
    camara.leido.emit(ID);
    expect(navigate).toHaveBeenCalledWith(['/mis-asignados'], { queryParams: { openPedido: ID } });
  });

  it('el QR abierto con la cámara del móvil (?codigo=) va directo al pedido', async () => {
    await render('USER', ID);

    expect(navigate).toHaveBeenCalledWith(['/mis-pedidos'], { queryParams: { openPedido: ID } });
  });

  it('escrito a mano o con un lector USB (teclado + Intro)', async () => {
    const { fixture, element } = await render('ADMIN');
    const campo = element.querySelector<HTMLInputElement>('input')!;

    campo.value = ID.toLowerCase();
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/pedidos'], { queryParams: { openPedido: ID } });
    expect(campo.value).toBe('');
  });

  it('un código que no es de un pedido lo dice y no navega', async () => {
    const { fixture, camara, element } = await render('OWNER');

    camara.leido.emit('8412345678905');
    await fixture.whenStable();

    expect(navigate).not.toHaveBeenCalled();
    expect(element.querySelector('[role=alert]')?.textContent).toContain(
      'no es el código de un pedido',
    );
  });
});
