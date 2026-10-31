import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TournamentContext } from '../core/tournament-context/tournament-context';
import { TournamentSwitcher } from './tournament-switcher';

describe('TournamentSwitcher', () => {
  const tournaments = signal<{ id: string; name: string }[]>([]);
  const selectedId = signal<string | null>(null);
  const context = {
    tournaments,
    selectedId,
    selected: () => tournaments().find((t) => t.id === selectedId()) ?? null,
    select: vi.fn(),
  };

  const render = async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: TournamentContext, useValue: context }],
    });
    const fixture = TestBed.createComponent(TournamentSwitcher);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tournaments.set([]);
    selectedId.set(null);
  });

  it('sin torneos no muestra nada', async () => {
    const element = await render();
    expect(element.textContent?.trim()).toBe('');
  });

  it('con un solo torneo muestra el nombre, sin selector', async () => {
    tournaments.set([{ id: 'a', name: 'Madrid Open' }]);
    selectedId.set('a');

    const element = await render();

    expect(element.querySelector('select')).toBeNull();
    expect(element.textContent).toContain('Madrid Open');
  });

  it('con varios permite elegir', async () => {
    tournaments.set([
      { id: 'a', name: 'Madrid Open' },
      { id: 'b', name: 'Roland Garros' },
    ]);
    const element = await render();
    const select = element.querySelector('select')!;

    select.value = 'b';
    select.dispatchEvent(new Event('change'));

    expect(context.select).toHaveBeenCalledWith('b');
  });

  it('elegir la opción vacía limpia la selección', async () => {
    tournaments.set([
      { id: 'a', name: 'Madrid Open' },
      { id: 'b', name: 'Roland Garros' },
    ]);
    const element = await render();
    const select = element.querySelector('select')!;

    select.value = '';
    select.dispatchEvent(new Event('change'));

    expect(context.select).toHaveBeenCalledWith(null);
  });
});
