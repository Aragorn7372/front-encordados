import { PaymentStatus } from '../../../../shared/models/status';

export interface LineaForm {
  raqueta: string;
  /** Raquetas iguales: al enviar se crea una línea por unidad. */
  cantidad: number;
  /** Vacío = la fecha del pedido. Mismo formato que PedidoFormValue.fecha. */
  fecha: string;
  nudos: number;
  logo: boolean;
  color: string;
  cuerdaV: string;
  tensionV: number;
  preestiradoV: number;
  cuerdaH: string;
  tensionH: number;
  preestiradoH: number;
}

export interface ArticuloForm {
  articulo: string;
  cantidad: number;
  precio: number;
  notas: string;
}

export interface PedidoFormValue {
  tipo: 'encordado' | 'taller';
  jugador: string;
  encordador: string;
  maquina: string;
  /** yyyy-MM-ddTHH:mm, el formato de <input type="datetime-local">. */
  fecha: string;
  materialPropio: boolean;
  precio: number;
  pago: PaymentStatus;
  comentarios: string;
  cuando: string;
  lineas: LineaForm[];
  articulos: ArticuloForm[];
}

/** Precios del front antiguo: encordado completo y solo mano de obra si trae el material. */
export const PRECIO_ENCORDADO = 18;
export const PRECIO_MANO_OBRA = 10;

export const MAX_UNIDADES = 20;

export function nuevaLinea(anterior?: LineaForm): LineaForm {
  // Lo normal es encordar varias raquetas igual: se copia el cordaje de la anterior
  return {
    raqueta: '',
    cantidad: 1,
    fecha: '',
    nudos: anterior?.nudos ?? 2,
    logo: anterior?.logo ?? false,
    color: anterior?.logo ? anterior.color : '',
    cuerdaV: anterior?.cuerdaV ?? '',
    tensionV: anterior?.tensionV ?? 24,
    preestiradoV: anterior?.preestiradoV ?? 0,
    cuerdaH: anterior?.cuerdaH ?? '',
    tensionH: anterior?.tensionH ?? 24,
    preestiradoH: anterior?.preestiradoH ?? 0,
  };
}

export function nuevoArticulo(): ArticuloForm {
  return { articulo: '', cantidad: 1, precio: PRECIO_ENCORDADO, notas: '' };
}

/** Mañana a la misma hora en punto, en hora local. */
export function fechaPorDefecto(now = new Date()): string {
  const date = new Date(now);
  date.setDate(date.getDate() + 1);
  date.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
}

export function pedidoVacio(): PedidoFormValue {
  return {
    tipo: 'encordado',
    jugador: '',
    encordador: '',
    maquina: '',
    fecha: fechaPorDefecto(),
    materialPropio: false,
    precio: PRECIO_ENCORDADO,
    pago: 'PENDING_PAYMENT',
    comentarios: '',
    cuando: '',
    lineas: [nuevaLinea()],
    articulos: [nuevoArticulo()],
  };
}

export function precioSugerido(value: PedidoFormValue): number {
  if (value.tipo === 'taller') {
    return value.articulos.reduce((total, a) => total + a.precio * a.cantidad, 0);
  }
  const unidad = value.materialPropio ? PRECIO_MANO_OBRA : PRECIO_ENCORDADO;
  return unidad * totalRaquetas(value);
}

export function totalRaquetas(value: PedidoFormValue): number {
  return value.lineas.reduce((total, linea) => total + linea.cantidad, 0);
}
