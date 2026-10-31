import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideSpanishLocale } from './provide-locale';

@Component({
  imports: [CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ fecha | date: 'MMMM' }} {{ 12.5 | currency: 'EUR' }}`,
})
class Host {
  protected readonly fecha = new Date(2026, 9, 15);
}

describe('provideSpanishLocale', () => {
  it('formatea fechas y moneda en español', async () => {
    TestBed.configureTestingModule({ providers: [provideSpanishLocale()] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('octubre');
    expect(text).toMatch(/12,50\s€/);
  });
});
