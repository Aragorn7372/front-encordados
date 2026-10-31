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

export const LINE_STATUS: Record<LineStatus, StatusInfo> = {
  PENDING: { label: 'Pendiente', tone: 'warning' },
  IN_PROGRESS: { label: 'En proceso', tone: 'info' },
  COMPLETED: { label: 'Listo', tone: 'success' },
  CANCELED: { label: 'Cancelado', tone: 'error' },
  DELIVERED_TOpLAYER: { label: 'Entregado', tone: 'neutral' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, StatusInfo> = {
  PENDING_PAYMENT: { label: 'Pendiente', tone: 'warning' },
  PAID: { label: 'Pagado', tone: 'success' },
  FINNISH_TOURNAMENT: { label: 'Cerrado por torneo', tone: 'neutral' },
  CANCELED: { label: 'Cancelado', tone: 'error' },
};

export const TOURNAMENT_STATUS: Record<TournamentStatus, StatusInfo> = {
  pendiente: { label: 'Pendiente', tone: 'warning' },
  activo: { label: 'Activo', tone: 'success' },
  cerrado: { label: 'Cerrado', tone: 'neutral' },
};
