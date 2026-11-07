import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { PwaAvisos } from './pwa-avisos';
import { PwaService } from './pwa.service';

describe('PwaService', () => {
  const versionUpdates = new Subject<VersionEvent>();
  const unrecoverable = new Subject<unknown>();
  const updates = {
    isEnabled: true,
    versionUpdates,
    unrecoverable,
    checkForUpdate: vi.fn(async () => false),
    activateUpdate: vi.fn(async () => true),
  };

  const setup = (isEnabled = true) => {
    updates.isEnabled = isEnabled;
    TestBed.configureTestingModule({ providers: [{ provide: SwUpdate, useValue: updates }] });
    return TestBed.inject(PwaService);
  };

  beforeEach(() => vi.clearAllMocks());

  it('avisa cuando hay una versión nueva lista', () => {
    const pwa = setup();
    expect(pwa.nuevaVersion()).toBe(false);

    versionUpdates.next({ type: 'VERSION_DETECTED' } as VersionEvent);
    expect(pwa.nuevaVersion()).toBe(false);

    versionUpdates.next({ type: 'VERSION_READY' } as VersionEvent);
    expect(pwa.nuevaVersion()).toBe(true);
  });

  it('sigue la conexión con los eventos del navegador', () => {
    const pwa = setup();

    window.dispatchEvent(new Event('offline'));
    expect(pwa.conectado()).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(pwa.conectado()).toBe(true);
  });

  it('guarda el aviso de instalar y lo lanza cuando se pide, una sola vez', async () => {
    const pwa = setup();
    const evento = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(async () => undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });

    window.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
    expect(pwa.instalable()).toBe(true);

    await pwa.instalar();
    expect(evento.prompt).toHaveBeenCalledTimes(1);
    expect(pwa.instalable()).toBe(false);
  });

  it('al volver a la pestaña mira si hay versión nueva', () => {
    setup();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

    document.dispatchEvent(new Event('visibilitychange'));

    expect(updates.checkForUpdate).toHaveBeenCalled();
  });

  it('sin service worker (desarrollo) no se suscribe a versiones', () => {
    const pwa = setup(false);
    versionUpdates.next({ type: 'VERSION_READY' } as VersionEvent);
    expect(pwa.nuevaVersion()).toBe(false);
  });
});

describe('PwaAvisos', () => {
  it('enseña los avisos según el estado', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: false,
            versionUpdates: new Subject(),
            unrecoverable: new Subject(),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(PwaAvisos);
    const pwa = TestBed.inject(PwaService);
    const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
    await fixture.whenStable();
    expect(texto().trim()).toBe('');

    pwa.conectado.set(false);
    pwa.nuevaVersion.set(true);
    await fixture.whenStable();

    expect(texto()).toContain('Sin conexión');
    expect(texto()).toContain('Hay una versión nueva');
  });
});
