/** Contrato del backend para torneos: los nombres tal cual, erratas incluidas. */

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

export interface WorkerAssignment {
  machineName: string;
  user: TournamentUser;
}
