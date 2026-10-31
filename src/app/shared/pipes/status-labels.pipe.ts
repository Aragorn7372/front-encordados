import { Pipe, PipeTransform } from '@angular/core';
import { ROLE_LABEL, Role } from '../models/roles';
import {
  LINE_STATUS,
  LineStatus,
  PAYMENT_STATUS,
  PaymentStatus,
  TOURNAMENT_STATUS,
} from '../models/status';
import { TournamentSummary, tournamentStatus } from '../models/tournament';

@Pipe({ name: 'lineStatusLabel' })
export class LineStatusLabelPipe implements PipeTransform {
  transform(status: LineStatus): string {
    return LINE_STATUS[status]?.label ?? status;
  }
}

@Pipe({ name: 'paymentLabel' })
export class PaymentLabelPipe implements PipeTransform {
  transform(status: PaymentStatus): string {
    return PAYMENT_STATUS[status]?.label ?? status;
  }
}

@Pipe({ name: 'roleLabel' })
export class RoleLabelPipe implements PipeTransform {
  transform(role: Role): string {
    return ROLE_LABEL[role] ?? role;
  }
}

@Pipe({ name: 'tournamentStatus' })
export class TournamentStatusPipe implements PipeTransform {
  transform(tournament: Pick<TournamentSummary, 'startTournament' | 'endTournament'>): string {
    return TOURNAMENT_STATUS[tournamentStatus(tournament)].label;
  }
}
