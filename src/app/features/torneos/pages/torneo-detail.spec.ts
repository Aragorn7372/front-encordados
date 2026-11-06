import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { Role } from '../../../shared/models/roles';
import { TorneosApi } from '../data-access/api/torneos.api';
import TorneoDetail from './torneo-detail';

const user = (username: string) => ({ username, name: username, imageUrl: '', bonos: 0 });

describe('TorneoDetail', () => {
  const api = {
    get: vi.fn(() =>
      of({
        id: 't1',
        name: 'Madrid Open',
        startTournament: '2026-06-01T00:00:00Z',
        endTournament: '2026-06-10T00:00:00Z',
        logotype: null,
        stringers: [user('carlos')],
        owner: user('ana'),
        supervisors: [user('luis')],
      }),
    ),
    workers: vi.fn(() => of([{ machineName: 'M-1', user: user('carlos') }])),
    encorders: vi.fn(() => of([])),
    supervisors: vi.fn(() => of([])),
  };

  const render = async (role: Role) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TorneosApi, useValue: api },
        { provide: AuthStore, useValue: { hasRole: (...roles: Role[]) => roles.includes(role) } },
      ],
    });
    const fixture = TestBed.createComponent(TorneoDetail);
    fixture.componentRef.setInput('id', 't1');
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => vi.clearAllMocks());

  it('OWNER ve máquinas y puede gestionar', async () => {
    const element = await render('OWNER');

    expect(element.textContent).toContain('Madrid Open');
    expect(element.textContent).toContain('M-1');
    expect(element.querySelectorAll('form')).toHaveLength(2);
  });

  it('ENCORDER no pide /workers, que está reservado a OWNER, y solo consulta', async () => {
    const element = await render('ENCORDER');

    expect(api.workers).not.toHaveBeenCalled();
    expect(element.textContent).toContain('carlos');
    expect(element.querySelector('form')).toBeNull();
  });

  it('si falla la carga lo explica', async () => {
    api.get.mockReturnValueOnce(throwError(() => ({ status: 404 })));
    const element = await render('OWNER');

    expect(element.textContent).toContain('No se ha podido cargar el torneo');
  });
});
