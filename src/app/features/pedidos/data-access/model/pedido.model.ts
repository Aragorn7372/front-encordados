import { LineStatus, PaymentStatus } from '../../../../shared/models/status';
import { PedidoUsuarioDto } from '../dto/pedido.dto';

export type Columna = 'pendiente' | 'proceso' | 'listo' | 'cerrado';

export const COLUMNAS: { id: Columna; label: string }[] = [
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'proceso', label: 'En proceso' },
  { id: 'listo', label: 'Listo' },
  { id: 'cerrado', label: 'Entregado o cancelado' },
];

export interface Cordaje {
  cuerda: string;
  tension: number;
  preestirado: number;
}

interface LineaBase {
  id: string;
  estado: LineStatus;
  fecha: string;
}

export interface LineaEncordado extends LineaBase {
  tipo: 'encordado';
  raqueta: string;
  nudos: number;
  logo: boolean;
  color: string;
  vertical: Cordaje;
  horizontal: Cordaje;
}

export interface ArticuloTaller extends LineaBase {
  tipo: 'taller';
  articulo: string;
  cantidad: number;
  notas: string;
  cuando: string;
}

export type LineaPedido = LineaEncordado | ArticuloTaller;

/** Modelo limpio: fuera del mapper nadie conoce las convenciones del backend. */
export interface Pedido {
  id: string;
  tournamentId: string;
  tipo: 'encordado' | 'taller';
  jugador: PedidoUsuarioDto;
  encordador: PedidoUsuarioDto;
  maquina: string;
  comentarios: string;
  materialPropio: boolean;
  pago: PaymentStatus;
  precio: number;
  creadoEn: string;
  actualizadoEn: string;
  /** Fecha más próxima de sus líneas. */
  requeridoEn: string | null;
  estado: LineStatus;
  columna: Columna;
  lineas: LineaPedido[];
}

/** Una tarjeta del tablero: una raqueta (o artículo) con el pedido al que pertenece. */
export interface Tarjeta {
  pedido: Pedido;
  linea: LineaPedido;
  columna: Columna;
  /** Posición de la línea en su pedido: distingue raquetas iguales del mismo jugador. */
  numero: number;
  total: number;
}
