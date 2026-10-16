import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideSpanishLocale } from './core/config/i18n/provide-locale';

describe('App', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideSpanishLocale()],
    }).compileComponents();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra la fecha y la moneda en español', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).querySelector('p')?.textContent ?? '';
    expect(text).toMatch(/12,50\s€/);
  });
});
