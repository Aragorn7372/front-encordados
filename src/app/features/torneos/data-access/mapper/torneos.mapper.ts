import { TournamentDetails } from '../model/torneo.model';
import { TournamentDetailsDto } from '../dto/torneo.dto';

/** Único sitio que conoce las diferencias del DTO de detalle frente al del listado. */
export function toTournamentDetails(dto: TournamentDetailsDto): TournamentDetails {
  return {
    id: dto.id,
    name: dto.name,
    startTournament: dto.startDate,
    endTournament: dto.endDate,
    logotype: dto.logotype,
    stringers: dto.user,
    owner: dto.owner,
    supervisors: dto.supevisors,
  };
}

/** Fecha local en el formato de <input type="date">. Cortar el ISO daría el día en UTC. */
export function toDateInput(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// Sin la Z, `new Date` interpreta la hora como local: el día que eligió el usuario
export const startOfDay = (date: string) => new Date(`${date}T00:00:00`).toISOString();

/** El torneo sigue activo durante todo su último día. */
export const endOfDay = (date: string) => new Date(`${date}T23:59:59`).toISOString();
