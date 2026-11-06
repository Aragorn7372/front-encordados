import { LINE_STATUS, estadoLinea, estadoPedido } from '../../../../shared/models/status';
import { contiene } from '../../../../shared/utils/texto';
import { PedidoInformeDto } from '../dto/informe.dto';
import {
  ESTADOS_INFORME,
  FiltrosInforme,
  Kpis,
  PedidoInforme,
  SerieDiaria,
} from '../model/informe.model';

const pad = (n: number) => String(n).padStart(2, '0');

/** yyyy-MM-dd en hora local. */
export function diaLocal(iso: string): string {
  const fecha = new Date(iso);
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

export function toPedidoInforme(dto: PedidoInformeDto): PedidoInforme {
  const lineas = dto.lineas ?? [];
  return {
    id: dto.id,
    jugador: dto.player?.name || dto.player?.username || '—',
    encordador: dto.encorder?.name || dto.encorder?.username || '—',
    pago: dto.payStatus,
    precio: dto.price ?? 0,
    creadoEn: dto.createdAt,
    dia: diaLocal(dto.createdAt),
    estado: estadoPedido(lineas.map((linea) => estadoLinea(linea.status))),
    raquetas: lineas.length,
  };
}

export function filtrar(pedidos: PedidoInforme[], filtros: FiltrosInforme): PedidoInforme[] {
  return pedidos.filter(
    (pedido) =>
      (!filtros.desde || pedido.dia >= filtros.desde) &&
      (!filtros.hasta || pedido.dia <= filtros.hasta) &&
      (!filtros.estado || pedido.estado === filtros.estado) &&
      (!filtros.encordador || pedido.encordador === filtros.encordador) &&
      contiene([pedido.jugador], filtros.jugador),
  );
}

const cancelado = (pedido: PedidoInforme) =>
  pedido.estado === 'CANCELED' || pedido.pago === 'CANCELED';

/** Lo cancelado cuenta como pedido, pero no como dinero: nunca se cobró ni se cobrará. */
export function kpis(pedidos: PedidoInforme[]): Kpis {
  const vivos = pedidos.filter((pedido) => !cancelado(pedido));
  const suma = (lista: PedidoInforme[]) => lista.reduce((total, p) => total + p.precio, 0);
  const facturado = suma(vivos);
  return {
    pedidos: pedidos.length,
    jugadores: new Set(pedidos.map((p) => p.jugador).filter((j) => j !== '—')).size,
    raquetas: pedidos.reduce((total, p) => total + p.raquetas, 0),
    facturado,
    cobrado: suma(vivos.filter((p) => p.pago === 'PAID')),
    pendiente: suma(vivos.filter((p) => p.pago === 'PENDING_PAYMENT')),
    ticketMedio: vivos.length ? facturado / vivos.length : 0,
  };
}

/** Cuántos pedidos hay en cada estado, en el orden de ESTADOS_INFORME. */
export function porEstado(pedidos: PedidoInforme[]): number[] {
  return ESTADOS_INFORME.map((estado) => pedidos.filter((p) => p.estado === estado).length);
}

/** Todos los días entre el primero y el último con pedidos: los días sin pedidos salen a 0. */
function diasSeguidos(pedidos: PedidoInforme[]): string[] {
  if (pedidos.length === 0) return [];
  const ordenados = pedidos.map((p) => p.dia).sort();
  const dias: string[] = [];
  const actual = new Date(`${ordenados[0]}T12:00:00`);
  const fin = ordenados.at(-1)!;
  while (diaLocal(actual.toISOString()) <= fin && dias.length < 366) {
    dias.push(diaLocal(actual.toISOString()));
    actual.setDate(actual.getDate() + 1);
  }
  return dias;
}

export function pedidosPorDia(pedidos: PedidoInforme[]): SerieDiaria {
  const dias = diasSeguidos(pedidos);
  return {
    dias,
    series: ESTADOS_INFORME.map((estado) => ({
      nombre: LINE_STATUS[estado].label,
      datos: dias.map((dia) => pedidos.filter((p) => p.dia === dia && p.estado === estado).length),
    })),
  };
}

export function ingresosPorDia(pedidos: PedidoInforme[]): SerieDiaria {
  const vivos = pedidos.filter((pedido) => !cancelado(pedido));
  const dias = diasSeguidos(vivos);
  const suma = (dia: string, pagado: boolean) =>
    vivos
      .filter((p) => p.dia === dia && (pagado ? p.pago === 'PAID' : p.pago === 'PENDING_PAYMENT'))
      .reduce((total, p) => total + p.precio, 0);
  return {
    dias,
    series: [
      { nombre: 'Cobrado', datos: dias.map((dia) => suma(dia, true)) },
      { nombre: 'Pendiente de cobro', datos: dias.map((dia) => suma(dia, false)) },
    ],
  };
}

/** Los jugadores o encordadores con más pedidos, de más a menos (empate: por nombre). */
export function topPor(
  pedidos: PedidoInforme[],
  campo: 'jugador' | 'encordador',
  cuantos = 8,
): [string, number][] {
  const cuenta = new Map<string, number>();
  for (const pedido of pedidos) {
    const nombre = pedido[campo];
    if (nombre === '—') continue;
    cuenta.set(nombre, (cuenta.get(nombre) ?? 0) + 1);
  }
  return [...cuenta.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, cuantos);
}
