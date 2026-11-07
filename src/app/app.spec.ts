import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { App } from './app';

describe('App', () => {
  it('monta las notificaciones globales fuera del layout, para que se vean en el login', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      // Desactivado, como en desarrollo: los avisos de la PWA necesitan SwUpdate
      providers: [provideRouter([]), provideServiceWorker('ngsw-worker.js', { enabled: false })],
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-toaster')).not.toBeNull();
    expect(element.querySelector('app-confirm-dialog')).not.toBeNull();
  });
});
