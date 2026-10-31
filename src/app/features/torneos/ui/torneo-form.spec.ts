import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { Role } from '../../../shared/models/roles';
import { TorneosApi } from '../data-access/torneos.api';
import { endOfDay, startOfDay } from '../data-access/torneos.mapper';
import { TorneoForm } from './torneo-form';

describe('TorneoForm', () => {
  const api = {
    create: vi.fn(() => of({})),
    update: vi.fn(() => of({})),
    owners: vi.fn(() => of([{ userId: 'o1', name: 'Ana', username: 'ana' }])),
  };
  let fixture: ComponentFixture<TorneoForm>;
  let saved: number;

  const element = () => fixture.nativeElement as HTMLElement;

  const render = async (role: Role, tournament: unknown = null) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TorneosApi, useValue: api },
        { provide: AuthStore, useValue: { hasRole: (...roles: Role[]) => roles.includes(role) } },
      ],
    });
    fixture = TestBed.createComponent(TorneoForm);
    fixture.componentRef.setInput('tournament', tournament);
    saved = 0;
    fixture.componentInstance.saved.subscribe(() => saved++);
    await fixture.whenStable();
  };

  const type = (id: string, value: string) => {
    const input = element().querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  const fill = () => {
    type('torneo-name', 'Madrid Open');
    type('torneo-start', '2026-06-01');
    type('torneo-end', '2026-06-10');
  };

  const submit = async () => {
    element()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(() => vi.clearAllMocks());

  it('OWNER crea un torneo sin elegir propietario', async () => {
    await render('OWNER');
    expect(element().querySelector('#torneo-owner')).toBeNull();
    fill();

    await submit();

    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Madrid Open', endDate: '2026-06-10' }),
      false,
    );
    expect(saved).toBe(1);
  });

  it('ADMIN debe elegir propietario', async () => {
    await render('ADMIN');
    fill();

    await submit();

    expect(api.create).not.toHaveBeenCalled();
    expect(element().textContent).toContain('Elige un propietario');
  });

  it('ADMIN crea indicando el propietario', async () => {
    await render('ADMIN');
    fill();
    const select = element().querySelector<HTMLSelectElement>('#torneo-owner')!;
    select.value = 'o1';
    select.dispatchEvent(new Event('input'));

    await submit();

    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'o1' }), true);
  });

  it('rechaza un fin anterior al inicio', async () => {
    await render('OWNER');
    fill();
    type('torneo-end', '2026-05-01');

    await submit();

    expect(api.create).not.toHaveBeenCalled();
    expect(element().textContent).toContain('El fin no puede ser anterior al inicio');
  });

  it('al editar precarga los datos y actualiza', async () => {
    await render('OWNER', {
      id: 't1',
      name: 'Madrid',
      startTournament: startOfDay('2026-06-01'),
      endTournament: endOfDay('2026-06-10'),
    });
    expect(element().querySelector<HTMLInputElement>('#torneo-end')!.value).toBe('2026-06-10');

    await submit();

    expect(api.update).toHaveBeenCalledWith('t1', expect.objectContaining({ name: 'Madrid' }));
    expect(api.create).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor sin cerrar el formulario', async () => {
    api.create.mockReturnValueOnce(
      throwError(() => ({ status: 400, message: 'Nombre repetido', fieldErrors: {} })),
    );
    await render('OWNER');
    fill();

    await submit();

    expect(element().querySelector('[role=alert]')?.textContent).toContain('Nombre repetido');
    expect(saved).toBe(0);
  });
});
