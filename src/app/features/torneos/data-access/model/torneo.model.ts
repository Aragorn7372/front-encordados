import { TournamentSummary } from '../../../../shared/models/tournament';
import { TournamentUser } from '../dto/torneo.dto';

export interface TournamentDetails extends TournamentSummary {
  stringers: TournamentUser[];
  owner: TournamentUser;
  supervisors: TournamentUser[];
}

export interface TournamentFormValue {
  name: string;
  /** yyyy-MM-dd, el formato de <input type="date">. */
  startDate: string;
  endDate: string;
  ownerId: string;
  logo: File | null;
}
