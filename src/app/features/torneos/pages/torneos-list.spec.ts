import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { TournamentContext } from '../../../core/tournament-context/tournament-context';
import { Role } from '../../../shared/models/roles';
import { TorneosApi } from '../data-access/api/torneos.api';
import TorneosList from './torneos-list';

const torneo = {
  id: 't1',
  name: 'Madrid Open',
  startTournament: '2026-06-01T00:00:00Z',
  endTournament: '2026-06-10T00:00:00Z',
  logotype: null,
};

describe('TorneosList', () => {
  const content = signal([torneo]);
  const api = {
    list: vi.fn(() => of({ content: content(), totalPages: 1 })),
    remove: vi.fn(() => of(undefined)),
  };
  const confirm = { ask: vi.fn(async () => true) };
  const context = { reload: vi.fn() };
  let fixture: ComponentFixture<TorneosList>;

  const element = () => fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...element().querySelectorAll('button')].find((b) => b.textContent?.includes(text));

  const render = async (role: Role) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TorneosApi, useValue: api },
        { provide: ConfirmService, useValue: confirm },
        { provide: TournamentContext, useValue: context },
        { provide: AuthStore, useValue: { hasRole: (...roles: Role[]) => roles.includes(role) } },
      ],
    });
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    fixture = TestBed.createComponent(TorneosList);
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    content.set([torneo]);
  });

  it('pinta los torneos con su estado', async () => {
    await render('ENCORDER');
    expect(element().textContent).toContain('Madrid Open');
    expect(element().querySelector('.badge')).not.toBeNull();
  });

  it('ENCORDER solo consulta', async () => {
    await render('ENCORDER');
    expect(button('Nuevo torneo')).toBeUndefined();
    expect(button('Editar')).toBeUndefined();
    expect(button('Borrar')).toBeUndefined();
  });

  it('OWNER gestiona pero no borra', async () => {
    await render('OWNER');
    expect(button('Nuevo torneo')).toBeDefined();
    expect(button('Editar')).toBeDefined();
    expect(button('Borrar')).toBeUndefined();
  });

  it('ADMIN borra tras confirmar y refresca también el selector global', async () => {
    await render('ADMIN');

    button('Borrar')!.click();
    await vi.waitFor(() => expect(api.remove).toHaveBeenCalledWith('t1'));
    await vi.waitFor(() => expect(context.reload).toHaveBeenCalled());
  });

  it('no borra si se cancela', async () => {
    confirm.ask.mockResolvedValueOnce(false);
    await render('ADMIN');

    button('Borrar')!.click();
    await vi.waitFor(() => expect(confirm.ask).toHaveBeenCalled());
    await fixture.whenStable();

    expect(api.remove).not.toHaveBeenCalled();
  });

  it('crea el formulario al abrirlo, con los datos del torneo a editar', async () => {
    await render('OWNER');
    expect(element().querySelector('app-torneo-form')).toBeNull();

    button('Editar')!.click();
    await fixture.whenStable();

    const name = element().querySelector<HTMLInputElement>('#torneo-name');
    expect(name?.value).toBe('Madrid Open');
  });

  it('sin resultados muestra el estado vacío', async () => {
    content.set([]);
    await render('OWNER');
    expect(element().textContent).toContain('No hay torneos');
  });
});
