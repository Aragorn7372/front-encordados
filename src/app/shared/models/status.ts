/** Colores semánticos de daisyUI: siguen el tema activo. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

export interface StatusInfo {
  label: string;
  tone: Tone;
}

// Las erratas son del contrato con el backend: no se pueden corregir solo aquí
export type LineStatus =
  'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'DELIVERED_TOpLAYER';
export type PaymentStatus = 'PENDING_PAYMENT' | 'PAID' | 'FINNISH_TOURNAMENT' | 'CANCELED';
export type TournamentStatus = 'pendiente' | 'activo' | 'cerrado';

/** Mismo orden que el enum Status del backend: los eventos de SignalR lo mandan como número. */
const ESTADOS_POR_VALOR: LineStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
  'DELIVERED_TOpLAYER',
];

export function estadoLinea(status: LineStatus | number): LineStatus {
  return typeof status === 'number' ? ESTADOS_POR_VALOR[status] : status;
}

/** El estado del pedido sale de sus líneas. Una cancelada no decide mientras queden otras activas. */
export function estadoPedido(estados: LineStatus[]): LineStatus {
  const activas = estados.filter((estado) => estado !== 'CANCELED');
  if (activas.length === 0) return estados.length > 0 ? 'CANCELED' : 'PENDING';
  if (activas.every((estado) => estado === 'DELIVERED_TOpLAYER')) return 'DELIVERED_TOpLAYER';
  if (activas.every((e) => e === 'COMPLETED' || e === 'DELIVERED_TOpLAYER')) return 'COMPLETED';
  if (activas.every((estado) => estado === 'PENDING')) return 'PENDING';
  return 'IN_PROGRESS';
}

export const LINE_STATUS: Record<LineStatus, StatusInfo> = {
  PENDING: { label: 'Pendiente', tone: 'warning' },
  IN_PROGRESS: { label: 'En proceso', tone: 'info' },
  COMPLETED: { label: 'Listo', tone: 'success' },
  CANCELED: { label: 'Cancelado', tone: 'error' },
  DELIVERED_TOpLAYER: { label: 'Entregado', tone: 'neutral' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, StatusInfo> = {
  PENDING_PAYMENT: { label: 'Pago pendiente', tone: 'warning' },
  PAID: { label: 'Pagado', tone: 'success' },
  FINNISH_TOURNAMENT: { label: 'Cerrado por torneo', tone: 'neutral' },
  CANCELED: { label: 'Cancelado', tone: 'error' },
};

export const TOURNAMENT_STATUS: Record<TournamentStatus, StatusInfo> = {
  pendiente: { label: 'Pendiente', tone: 'warning' },
  activo: { label: 'Activo', tone: 'success' },
  cerrado: { label: 'Cerrado', tone: 'neutral' },
};
