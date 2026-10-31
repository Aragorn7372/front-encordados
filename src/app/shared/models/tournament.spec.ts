import { tournamentStatus } from './tournament';

describe('tournamentStatus', () => {
  const tournament = {
    startTournament: '2026-06-10T00:00:00Z',
    endTournament: '2026-06-20T00:00:00Z',
  };

  it.each([
    ['2026-06-09T23:59:59Z', 'pendiente'],
    ['2026-06-10T00:00:00Z', 'activo'],
    ['2026-06-20T00:00:00Z', 'activo'],
    ['2026-06-20T00:00:01Z', 'cerrado'],
  ])('el %s está %s', (now, expected) => {
    expect(tournamentStatus(tournament, new Date(now))).toBe(expected);
  });
});
