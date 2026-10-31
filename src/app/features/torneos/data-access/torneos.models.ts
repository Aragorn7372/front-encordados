import { TournamentSummary } from '../../../shared/models/tournament';

/** UserResponseDto: viene sin id ni email. */
export interface TournamentUser {
  username: string;
  imageUrl: string;
  name: string;
  bonos: number;
}

/** UserWithIdDto: lo devuelven los listados de usuarios. */
export interface StaffUser extends TournamentUser {
  userId: string;
  email: string;
  role: string;
}

/** TournamentResponseDetailsDto. Respeta los nombres del backend, errata incluida. */
export interface TournamentDetailsDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  logotype: string | null;
  user: TournamentUser[];
  owner: TournamentUser;
  supevisors: TournamentUser[];
}

export interface TournamentDetails extends TournamentSummary {
  stringers: TournamentUser[];
  owner: TournamentUser;
  supervisors: TournamentUser[];
}

export interface WorkerAssignment {
  machineName: string;
  user: TournamentUser;
}

export interface TournamentFormValue {
  name: string;
  /** yyyy-MM-dd, el formato de <input type="date">. */
  startDate: string;
  endDate: string;
  ownerId: string;
  logo: File | null;
}
