import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const mockMatchMedia = (dark: boolean) =>
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: dark })));

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.resetTestingModule();     // servicio nuevo en cada test
  });

  afterEach(() => vi.unstubAllGlobals());

  it('sin preferencia guardada sigue al sistema (claro)', () => {
    mockMatchMedia(false);
    expect(TestBed.inject(ThemeService).theme()).toBe('corporate');
  });

  it('sin preferencia guardada sigue al sistema (oscuro)', () => {
    mockMatchMedia(true);
    expect(TestBed.inject(ThemeService).theme()).toBe('black');
  });

  it('respeta el tema guardado aunque el sistema diga otra cosa', () => {
    mockMatchMedia(true);
    localStorage.setItem('etr_theme', 'corporate');
    expect(TestBed.inject(ThemeService).theme()).toBe('corporate');
  });

  it('ignora valores inválidos (p. ej. del front antiguo)', () => {
    mockMatchMedia(false);
    localStorage.setItem('etr_theme', 'atp-dark');
    expect(TestBed.inject(ThemeService).theme()).toBe('corporate');
  });

  it('toggle cambia el tema, lo aplica en <html> y lo guarda', () => {
    mockMatchMedia(false);
    const service = TestBed.inject(ThemeService);

    service.toggle();
    TestBed.tick();                   // ejecuta el effect pendiente

    expect(service.theme()).toBe('black');
    expect(document.documentElement.getAttribute('data-theme')).toBe('black');
    expect(localStorage.getItem('etr_theme')).toBe('black');
  });
});
