import { TournamentStatus } from './status';

/** TournamentResponseDto: lo que devuelve el listado de torneos. */
export interface TournamentSummary {
  id: string;
  name: string;
  startTournament: string;
  endTournament: string;
  logotype: string | null;
}

export function tournamentStatus(
  tournament: Pick<TournamentSummary, 'startTournament' | 'endTournament'>,
  now = new Date(),
): TournamentStatus {
  if (now < new Date(tournament.startTournament)) return 'pendiente';
  if (now > new Date(tournament.endTournament)) return 'cerrado';
  return 'activo';
}
