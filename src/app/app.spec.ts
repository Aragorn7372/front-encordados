import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  it('monta las notificaciones globales fuera del layout, para que se vean en el login', async () => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-toaster')).not.toBeNull();
    expect(element.querySelector('app-confirm-dialog')).not.toBeNull();
  });
});
