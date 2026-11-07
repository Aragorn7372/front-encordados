import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { TorneosApi } from '../data-access/api/torneos.api';
import { WorkersPanel } from './workers-panel';

const user = (username: string) => ({ username, name: username, imageUrl: '', bonos: 0 });

describe('WorkersPanel', () => {
  const api = {
    encorders: vi.fn(() =>
      of([
        { ...user('carlos'), userId: 'u1' },
        { ...user('maria'), userId: 'u2' },
      ]),
    ),
    addWorker: vi.fn(() => of({})),
    removeWorker: vi.fn(() => of({})),
  };
  const confirm = { ask: vi.fn(async () => true) };
  let fixture: ComponentFixture<WorkersPanel>;
  let changes: number;

  const element = () => fixture.nativeElement as HTMLElement;

  const render = async (canManage: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TorneosApi, useValue: api },
        { provide: ConfirmService, useValue: confirm },
      ],
    });
    fixture = TestBed.createComponent(WorkersPanel);
    fixture.componentRef.setInput('tournamentId', 't1');
    fixture.componentRef.setInput('stringers', [user('carlos')]);
    fixture.componentRef.setInput('assignments', [{ machineName: 'M-1', user: user('carlos') }]);
    fixture.componentRef.setInput('canManage', canManage);
    changes = 0;
    fixture.componentInstance.changed.subscribe(() => changes++);
    await fixture.whenStable();
  };

  beforeEach(() => vi.clearAllMocks());

  it('muestra cada encordador con su máquina', async () => {
    await render(false);
    expect(element().textContent).toContain('carlos');
    expect(element().textContent).toContain('M-1');
  });

  it('un encordador sin máquina se muestra igualmente', async () => {
    await render(false);
    fixture.componentRef.setInput('assignments', []);
    await fixture.whenStable();

    expect(element().textContent).toContain('carlos');
    expect(element().textContent).toContain('Sin máquina asignada');
  });

  it('en solo lectura no pide datos de gestión ni muestra acciones', async () => {
    await render(false);

    expect(api.encorders).not.toHaveBeenCalled();
    expect(element().querySelector('form')).toBeNull();
    expect(element().querySelector('button')).toBeNull();
  });

  it('solo ofrece a quien no está ya en el torneo', async () => {
    await render(true);
    await fixture.whenStable();

    const options = [...element().querySelectorAll('#worker-user option')].map(
      (option) => option.textContent,
    );
    expect(options.join()).toContain('maria');
    expect(options.join()).not.toContain('carlos');
  });

  it('quitar traduce el username a su id', async () => {
    await render(true);
    await fixture.whenStable();

    element().querySelector<HTMLButtonElement>('button[aria-label="Quitar a carlos"]')!.click();
    await fixture.whenStable();
    await vi.waitFor(() => expect(api.removeWorker).toHaveBeenCalledWith('t1', 'u1'));

    await vi.waitFor(() => expect(changes).toBe(1));
  });

  it('no quita nada si se cancela la confirmación', async () => {
    confirm.ask.mockResolvedValueOnce(false);
    await render(true);
    await fixture.whenStable();

    element().querySelector<HTMLButtonElement>('button[aria-label="Quitar a carlos"]')!.click();
    await vi.waitFor(() => expect(confirm.ask).toHaveBeenCalled());
    await fixture.whenStable();

    expect(api.removeWorker).not.toHaveBeenCalled();
  });

  it('quien gestiona el torneo puede ir a los pedidos de cada encordador en ese torneo', async () => {
    await render(true);
    const enlace = fixture.nativeElement.querySelector(
      'a[aria-label^="Pedidos de"]',
    ) as HTMLAnchorElement | null;
    expect(enlace?.getAttribute('href')).toMatch(/^\/pedidos\?torneo=t1&encordador=/);
  });
});
