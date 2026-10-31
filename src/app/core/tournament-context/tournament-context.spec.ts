import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Role } from '../../shared/models/roles';
import { TournamentSummary } from '../../shared/models/tournament';
import { AuthStore } from '../auth/store/auth.store';
import { TournamentContext } from './tournament-context';

@Component({ template: '' })
class Empty {}

const torneo = (id: string): TournamentSummary => ({
  id,
  name: `Torneo ${id}`,
  startTournament: '2026-01-01',
  endTournament: '2026-01-02',
  logotype: null,
});

describe('TournamentContext', () => {
  const role = signal<Role | null>('OWNER');

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  const setup = () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: Empty }]),
        {
          provide: AuthStore,
          useValue: {
            isLoggedIn: () => role() !== null,
            hasRole: (...roles: Role[]) => role() !== null && roles.includes(role()!),
          },
        },
      ],
    });
    return {
      context: TestBed.inject(TournamentContext),
      backend: TestBed.inject(HttpTestingController),
    };
  };

  const answer = async (backend: HttpTestingController, content: TournamentSummary[]) => {
    TestBed.tick();
    backend.expectOne((req) => req.url === '/api/tournaments').flush({ content });
    await stable();
  };

  beforeEach(() => {
    localStorage.clear();
    role.set('OWNER');
  });

  it('pide el listado con pageSize, no con size', () => {
    const { backend } = setup();
    TestBed.tick();

    const { request } = backend.expectOne((req) => req.url === '/api/tournaments');
    expect(request.params.has('pageSize')).toBe(true);
    expect(request.params.has('size')).toBe(false);
  });

  it('un USER no pide torneos, porque el backend le respondería 403', () => {
    role.set('USER');
    const { context, backend } = setup();
    TestBed.tick();

    backend.expectNone((req) => req.url === '/api/tournaments');
    expect(context.tournaments()).toEqual([]);
  });

  it('expone el torneo seleccionado y lo recuerda', async () => {
    const { context, backend } = setup();
    await answer(backend, [torneo('a'), torneo('b')]);

    context.select('b');
    TestBed.tick();

    expect(context.selected()?.name).toBe('Torneo b');
    expect(localStorage.getItem('etr_torneo')).toBe('b');
  });

  it('recupera la selección guardada', async () => {
    localStorage.setItem('etr_torneo', 'b');
    const { context, backend } = setup();
    await answer(backend, [torneo('a'), torneo('b')]);

    expect(context.selected()?.id).toBe('b');
  });

  it('descarta un torneo guardado al que el usuario ya no tiene acceso', async () => {
    localStorage.setItem('etr_torneo', 'ajeno');
    const { context, backend } = setup();
    await answer(backend, [torneo('a'), torneo('b')]);

    expect(context.selectedId()).toBeNull();
    expect(localStorage.getItem('etr_torneo')).toBeNull();
  });

  it('con un solo torneo lo selecciona automáticamente', async () => {
    const { context, backend } = setup();
    await answer(backend, [torneo('a')]);

    expect(context.selected()?.id).toBe('a');
  });

  it('limpia la selección al cerrar sesión', async () => {
    const { context, backend } = setup();
    await answer(backend, [torneo('a'), torneo('b')]);
    context.select('a');
    TestBed.tick();

    role.set(null);
    TestBed.tick();

    expect(context.selectedId()).toBeNull();
  });

  it('adopta el torneo de un enlace directo ?torneo=', async () => {
    const { context, backend } = setup();
    await answer(backend, [torneo('a'), torneo('b')]);

    await TestBed.inject(Router).navigateByUrl('/pedidos?torneo=b');

    expect(context.selectedId()).toBe('b');
  });
});
