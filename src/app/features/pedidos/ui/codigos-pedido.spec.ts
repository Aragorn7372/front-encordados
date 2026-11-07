import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Impresion } from '../../../core/print/impresion';
import { Codigos, DIBUJAR_CODIGOS } from '../../../shared/utils/imagen-codigos';
import { Pedido } from '../data-access/model/pedido.model';
import { CodigosPedido } from './codigos-pedido';

const ID = '01M6V0BVX7VTT37BRAP2MGWN5H';
const pedido = (id = ID): Pedido =>
  ({
    id,
    jugador: { username: 'ana', name: 'Ana Pérez', imageUrl: '', bonos: 0 },
    lineas: [],
  }) as unknown as Pedido;

describe('CodigosPedido', () => {
  let dibujados: Codigos[];
  const impresion = { imprimirImagen: vi.fn(async () => undefined) };
  let fixture: ComponentFixture<CodigosPedido>;

  const render = async (p: Pedido) => {
    dibujados = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: Impresion, useValue: impresion },
        {
          provide: DIBUJAR_CODIGOS,
          useValue: async (codigos: Codigos) => {
            dibujados.push(codigos);
            return new Blob(['png'], { type: 'image/png' });
          },
        },
      ],
    });
    fixture = TestBed.createComponent(CodigosPedido);
    fixture.componentRef.setInput('pedido', p);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };
  const conImagen = async (p: Pedido) => {
    const element = await render(p);
    await vi.waitFor(() =>
      expect(element.querySelector('[data-testid=codigos-imagen]')).not.toBeNull(),
    );
    return element;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:codigos');
    URL.revokeObjectURL = vi.fn();
  });

  it('dibuja solo los dos códigos del pedido: el QR (URL al escáner) y el de barras (id)', async () => {
    await conImagen(pedido());

    expect(dibujados).toHaveLength(1);
    expect(dibujados[0].qr).toMatch(new RegExp(`/escanear\\?codigo=${ID}$`));
    expect(dibujados[0].barras).toBe(ID);
  });

  it('«Imprimir» manda esa misma imagen a la impresión', async () => {
    const element = await conImagen(pedido());

    (element.querySelector('.btn-primary') as HTMLButtonElement).click();

    expect(impresion.imprimirImagen).toHaveBeenCalledWith(
      'blob:codigos',
      'QR y código de barras del pedido de Ana Pérez',
    );
  });

  it('«Descargar» guarda un PNG con un nombre que se entiende', async () => {
    const element = await conImagen(pedido());
    let nombre = '';
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      nombre = this.download;
    });

    (element.querySelector('button') as HTMLButtonElement).click();

    expect(nombre).toBe('codigos-ana-perez.png');
    clic.mockRestore();
  });

  it('un pedido creado sin conexión aún no tiene códigos', async () => {
    const element = await render(pedido('tmp-1'));

    expect(element.textContent).toContain('Tendrá sus códigos cuando llegue al servidor');
    expect(element.querySelector('button')).toBeNull();
    expect(dibujados).toHaveLength(0);
  });
});
