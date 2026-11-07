import {
  LineStatus,
  PaymentStatus,
  estadoLinea,
  estadoPedido,
} from '../../../../shared/models/status';
import { contiene } from '../../../../shared/utils/texto';
import { PedidoLineaDto, PurchasedDto, StringSetupDto } from '../dto/pedido.dto';
import { Columna, LineaPedido, Pedido, Tarjeta } from '../model/pedido.model';

/** El backend no tiene campos para esto: viaja codificado en otros campos. */
const TALLER_MARK = 'ORDEN_DE_TALLER';
const MATERIAL_TAG = '[MATERIAL PROPIO]';
const CANTIDAD = /^Cant:\s*(\d+)(?:\s*\|\s*(.*))?$/s;

const DESTINO: Record<Columna, LineStatus> = {
  pendiente: 'PENDING',
  proceso: 'IN_PROGRESS',
  listo: 'COMPLETED',
  cerrado: 'DELIVERED_TOpLAYER',
};

export function estadoDestino(columna: Columna): LineStatus {
  return DESTINO[columna];
}

export function columnaDe(estado: LineStatus): Columna {
  if (estado === 'COMPLETED') return 'listo';
  if (estado === 'DELIVERED_TOpLAYER' || estado === 'CANCELED') return 'cerrado';
  return estado === 'PENDING' ? 'pendiente' : 'proceso';
}

function esTaller(setup: StringSetupDto | null | undefined): boolean {
  return setup?.stringH === TALLER_MARK;
}

function toLinea(dto: PedidoLineaDto): LineaPedido {
  const base = { id: dto.id, estado: estadoLinea(dto.status), fecha: dto.dateString };
  const setup = dto.stringSetup;

  if (esTaller(setup)) {
    const match = CANTIDAD.exec(dto.color ?? '');
    return {
      ...base,
      tipo: 'taller',
      articulo: dto.raquetModel,
      cantidad: match ? Number(match[1]) : 1,
      notas: match ? (match[2] ?? '').trim() : (dto.color ?? ''),
      cuando: setup.stringV === 'N/A' ? '' : setup.stringV,
    };
  }

  return {
    ...base,
    tipo: 'encordado',
    raqueta: dto.raquetModel,
    nudos: dto.nudos,
    logo: dto.logotype,
    color: dto.color,
    vertical: { cuerda: setup.stringV, tension: setup.tensionV, preestirado: setup.preStetchV },
    horizontal: { cuerda: setup.stringH, tension: setup.tensionH, preestirado: setup.preStetchH },
  };
}

function fechaRequerida(lineas: LineaPedido[]): string | null {
  const fechas = lineas.map((linea) => linea.fecha).filter(Boolean);
  if (fechas.length === 0) return null;
  return fechas.reduce((a, b) => (new Date(a) <= new Date(b) ? a : b));
}

/** Los comentarios del backend llevan la marca de material propio: se conserva al editarlos. */
export function toComments(comentarios: string, materialPropio: boolean): string {
  const texto = comentarios.trim();
  if (!materialPropio) return texto;
  return texto ? `${MATERIAL_TAG} ${texto}` : MATERIAL_TAG;
}

export function toPedido(dto: PurchasedDto): Pedido {
  const lineasDto = dto.lineas ?? [];
  const lineas = lineasDto.map(toLinea);
  const comments = dto.comments ?? '';
  const estado = estadoPedido(lineas.map((linea) => linea.estado));

  return {
    id: dto.id,
    tournamentId: dto.tournamentId,
    tipo: lineasDto.some((linea) => esTaller(linea.stringSetup)) ? 'taller' : 'encordado',
    jugador: dto.player,
    encordador: dto.encorder,
    maquina: dto.machine ?? '',
    comentarios: comments.replace(MATERIAL_TAG, '').trim(),
    materialPropio: comments.includes(MATERIAL_TAG),
    pago: dto.payStatus as PaymentStatus,
    precio: dto.price,
    creadoEn: dto.createdAt,
    actualizadoEn: dto.updatedAt,
    requeridoEn: fechaRequerida(lineas),
    estado,
    columna: columnaDe(estado),
    lineas,
  };
}

/** Los eventos de línea solo traen la línea: hay que recalcular lo que depende de ella. */
export function conLinea(pedido: Pedido, dto: PedidoLineaDto): Pedido {
  return conLineaPedido(pedido, toLinea(dto));
}

/** Igual que conLinea, con una línea ya traducida (para el movimiento optimista). */
export function conLineaPedido(pedido: Pedido, cambiada: LineaPedido): Pedido {
  const lineas = pedido.lineas.map((linea) => (linea.id === cambiada.id ? cambiada : linea));
  const estado = estadoPedido(lineas.map((linea) => linea.estado));
  return {
    ...pedido,
    lineas,
    estado,
    columna: columnaDe(estado),
    requeridoEn: fechaRequerida(lineas),
  };
}

/** El tablero muestra raquetas: cada línea es una tarjeta. */
export function tarjetasDe(pedido: Pedido): Tarjeta[] {
  return pedido.lineas.map((linea, index) => ({
    pedido,
    linea,
    columna: columnaDe(linea.estado),
    numero: index + 1,
    total: pedido.lineas.length,
  }));
}

export const nombreLinea = (linea: LineaPedido) =>
  linea.tipo === 'taller' ? linea.articulo : linea.raqueta;

const camposPedido = (pedido: Pedido) => [
  pedido.jugador.name,
  pedido.jugador.username,
  pedido.encordador.name,
  pedido.encordador.username,
  pedido.maquina,
  pedido.comentarios,
];

/** Búsqueda sobre los pedidos ya cargados, sin distinguir mayúsculas ni acentos. */
export function coincideBusqueda(pedido: Pedido, busqueda: string): boolean {
  return contiene([...camposPedido(pedido), ...pedido.lineas.map(nombreLinea)], busqueda);
}

/** Por tarjeta: buscar «pure aero» no debe sacar las otras raquetas del mismo pedido. */
export function coincideTarjeta({ pedido, linea }: Tarjeta, busqueda: string): boolean {
  const cuerdas =
    linea.tipo === 'encordado' ? [linea.vertical.cuerda, linea.horizontal.cuerda] : [];
  return contiene([...camposPedido(pedido), nombreLinea(linea), ...cuerdas], busqueda);
}

/** El backend no cancela lo ya completado o entregado. */
export function lineaCancelable(estado: LineStatus): boolean {
  return estado === 'PENDING' || estado === 'IN_PROGRESS';
}

export function pedidoCancelable(pedido: Pedido): boolean {
  return pedido.lineas.some((linea) => lineaCancelable(linea.estado));
}

const VEINTICUATRO_HORAS = 24 * 60 * 60 * 1000;

/** Solo lo que sigue pendiente de hacer puede ser urgente. Cada raqueta tiene su fecha. */
export function esUrgente(linea: LineaPedido, now = Date.now()): boolean {
  if (!lineaCancelable(linea.estado) || !linea.fecha) return false;
  return new Date(linea.fecha).getTime() - now <= VEINTICUATRO_HORAS;
}
