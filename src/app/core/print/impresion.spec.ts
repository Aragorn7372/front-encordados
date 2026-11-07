import { TestBed } from '@angular/core/testing';
import { Impresion } from './impresion';

describe('Impresion', () => {
  let print: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    print = vi.fn();
    window.print = print as unknown as typeof window.print;
    // jsdom no carga imágenes: se simula que la etiqueta ya está lista
    vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(function (
      this: HTMLImageElement,
    ) {
      queueMicrotask(() => this.onload?.(new Event('load')));
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('imprime solo la imagen y al cerrar el diálogo lo deja todo como estaba', async () => {
    const impresion = TestBed.inject(Impresion);

    await impresion.imprimirImagen('blob:etiqueta', 'Etiqueta del pedido de Ana');

    expect(print).toHaveBeenCalledTimes(1);
    expect(document.documentElement.classList.contains('imprimiendo')).toBe(true);
    expect(document.querySelector('.zona-impresion img')?.getAttribute('alt')).toBe(
      'Etiqueta del pedido de Ana',
    );

    window.dispatchEvent(new Event('afterprint'));

    expect(document.documentElement.classList.contains('imprimiendo')).toBe(false);
    expect(document.querySelector('.zona-impresion')).toBeNull();
  });

  it('si la imagen no carga, no abre el diálogo vacío', async () => {
    vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(function (
      this: HTMLImageElement,
    ) {
      queueMicrotask(() => this.onerror?.(new Event('error')));
    });

    await expect(TestBed.inject(Impresion).imprimirImagen('blob:x', 'x')).rejects.toThrow();
    expect(print).not.toHaveBeenCalled();
  });
});
