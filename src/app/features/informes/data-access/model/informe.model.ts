import { LineStatus, PaymentStatus } from '../../../../shared/models/status';

export interface PedidoInforme {
  id: string;
  jugador: string;
  encordador: string;
  pago: PaymentStatus;
  precio: number;
  /** ISO, del backend. */
  creadoEn: string;
  /** Día local (yyyy-MM-dd): así un pedido de las 00:30 no cae en el día anterior por UTC. */
  dia: string;
  estado: LineStatus;
  raquetas: number;
}

export interface FiltrosInforme {
  /** yyyy-MM-dd, el formato de <input type="date">. Vacío = sin límite. */
  desde: string;
  hasta: string;
  jugador: string;
  /** Exacto: sale de pulsar una barra de la gráfica de encordadores. */
  encordador: string;
  estado: LineStatus | '';
}

export interface Kpis {
  pedidos: number;
  /** Jugadores distintos con algún pedido. */
  jugadores: number;
  raquetas: number;
  /** Lo que no está cancelado. */
  facturado: number;
  cobrado: number;
  pendiente: number;
  ticketMedio: number;
}

/** Una serie apilada por día: las categorías y una fila de valores por nombre. */
export interface SerieDiaria {
  dias: string[];
  series: { nombre: string; datos: number[] }[];
}

export const FILTROS_VACIOS: FiltrosInforme = {
  desde: '',
  hasta: '',
  jugador: '',
  encordador: '',
  estado: '',
};

/** El orden en que se pintan los estados (y sus colores en la página). */
export const ESTADOS_INFORME: LineStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'DELIVERED_TOpLAYER',
  'CANCELED',
];
