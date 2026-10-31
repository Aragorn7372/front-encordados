import { endOfDay, startOfDay, toDateInput, toTournamentDetails } from './torneos.mapper';
import { TournamentDetailsDto, TournamentUser } from './torneos.models';

describe('torneos.mapper', () => {
  const user = (username: string): TournamentUser => ({
    username,
    imageUrl: '',
    name: username,
    bonos: 0,
  });

  it('unifica las fechas y corrige la errata de supevisors', () => {
    const dto: TournamentDetailsDto = {
      id: '1',
      name: 'Madrid',
      startDate: '2026-06-01T00:00:00Z',
      endDate: '2026-06-02T00:00:00Z',
      logotype: null,
      user: [user('carlos')],
      owner: user('ana'),
      supevisors: [user('luis')],
    };

    expect(toTournamentDetails(dto)).toMatchObject({
      startTournament: dto.startDate,
      endTournament: dto.endDate,
      stringers: [user('carlos')],
      supervisors: [user('luis')],
    });
  });

  it('el día elegido se conserva al ir y volver de la API, en cualquier zona horaria', () => {
    expect(toDateInput(startOfDay('2026-12-31'))).toBe('2026-12-31');
    expect(toDateInput(endOfDay('2026-12-31'))).toBe('2026-12-31');
  });

  it('cubre el día completo en hora local', () => {
    expect(new Date(startOfDay('2026-06-01')).getHours()).toBe(0);
    expect(new Date(endOfDay('2026-06-01')).getHours()).toBe(23);
  });
});
