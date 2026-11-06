export type RealtimeStatus = 'off' | 'connecting' | 'on';

export type NotificationType =
  | 'PEDIDO_CREADO'
  | 'PEDIDO_ACTUALIZADO'
  | 'PEDIDO_CANCELADO'
  | 'ESTATUS_LINEA_PEDIDO_ACTUALIZADA'
  | 'LINEA_PEDIDO_ACTUALIZADA';

/**
 * Mensaje de ReceiveTournamentNotification. `purchased` es el pedido completo en los eventos
 * de pedido y solo la línea en los de línea: lo interpreta cada feature.
 */
export interface TournamentNotification {
  tournamentId: string;
  pedidoId: string;
  lineaId?: string;
  tipo: NotificationType;
  status?: string;
  purchased: unknown;
  timestamp: string;
}
