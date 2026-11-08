import { TestBed } from '@angular/core/testing';
import { mediaQuery } from './media';

describe('mediaQuery', () => {
  const original = globalThis.matchMedia;
  afterEach(() => {
    globalThis.matchMedia = original;
  });

  it('sin matchMedia (jsdom) es false', () => {
    // @ts-expect-error: simula un entorno sin matchMedia
    globalThis.matchMedia = undefined;
    const movil = TestBed.runInInjectionContext(() => mediaQuery('(max-width: 767.98px)'));
    expect(movil()).toBe(false);
  });

  it('sigue a la media query al cambiar el tamaño, y deja de escuchar al destruirse', () => {
    let oyente: ((e: MediaQueryListEvent) => void) | undefined;
    const quitar = vi.fn();
    globalThis.matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener: (_: string, f: (e: MediaQueryListEvent) => void) => (oyente = f),
      removeEventListener: quitar,
    })) as unknown as typeof matchMedia;

    const movil = TestBed.runInInjectionContext(() => mediaQuery('(max-width: 767.98px)'));
    expect(movil()).toBe(true);

    oyente!({ matches: false } as MediaQueryListEvent);
    expect(movil()).toBe(false);

    TestBed.resetTestingModule();
    expect(quitar).toHaveBeenCalled();
  });
});
