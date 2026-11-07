import { sustituirIds } from '../../../../core/offline/outbox';
import { LINE_STATUS } from '../../../../shared/models/status';
import { PurchasedDto } from '../dto/pedido.dto';
import { CrearPedido, OperacionPedido, OP_PEDIDO } from '../model/pedido-operacion.model';
import { LineaPedido, Pedido } from '../model/pedido.model';
import { conLineaPedido, lineaCancelable, nombreLinea, toPedido } from './pedido.mapper';
import { PurchasedRequest } from './pedido-request';

interface Persona {
  username: string;
  name: string;
  bonos?: number;
}

/**
 * El pedido creado sin conexión, como lo devolvería el servidor, para verlo ya en el tablero.
 * Sus raquetas tienen ids `<tempId>~<n>`: lo que empieza por el id temporal es suyo.
 */
export function vistaPrevia(
  request: PurchasedRequest,
  tempId: string,
  jugador: Persona,
  encordador: Persona,
  ahora = new Date().toISOString(),
): PurchasedDto {
  const bonos = jugador.bonos ?? 0;
  return {
    id: tempId,
    tournamentId: request.tournamentId,
    player: { username: jugador.username, name: jugador.name, imageUrl: '', bonos },
    encorder: { username: encordador.username, name: encordador.name, imageUrl: '', bonos: 0 },
    machine: request.machine,
    comments: request.comments,
    // Igual que avisa el formulario: si los bonos alcanzan, el backend lo cobra con ellos
    payStatus: bonos > 0 && bonos >= request.price ? 'PAID' : request.payStatus,
    createdAt: ahora,
    updatedAt: ahora,
    price: request.price,
    lineas: request.lineas.map((linea, i) => ({
      ...linea,
      id: `${tempId}~${i}`,
      status: 'PENDING',
    })),
  };
}

const firma = (linea: LineaPedido) =>
  linea.tipo === 'taller'
    ? `t|${linea.articulo}|${linea.cantidad}|${linea.notas}`
    : `e|${linea.raqueta}|${linea.nudos}|${linea.vertical.cuerda}|${linea.vertical.tension}|${linea.horizontal.cuerda}|${linea.horizontal.tension}`;

/**
 * Qué id real tiene cada id temporal del pedido creado. Las raquetas se emparejan por su
 * contenido, no por posición: nada garantiza que el servidor las devuelva en el mismo orden.
 * Dos raquetas idénticas son intercambiables.
 */
export function idsCreados({ tempId, vista }: CrearPedido, real: Pedido): Record<string, string> {
  const ids: Record<string, string> = { [tempId]: real.id };
  const libres = [...real.lineas];
  for (const linea of toPedido(vista).lineas) {
    const i = libres.findIndex((l) => firma(l) === firma(linea));
    const pareja = libres.splice(i >= 0 ? i : 0, 1)[0];
    if (pareja) ids[linea.id] = pareja.id;
  }
  return ids;
}

const cambiarPedido = (pedidos: Pedido[], id: string, cambio: (pedido: Pedido) => Pedido) =>
  pedidos.map((pedido) => (pedido.id === id ? cambio(pedido) : pedido));

const cancelarLineaDe = (pedido: Pedido, linea: LineaPedido): Pedido =>
  lineaCancelable(linea.estado) ? conLineaPedido(pedido, { ...linea, estado: 'CANCELED' }) : pedido;

/**
 * Lo que se ve = lo del servidor (o su copia) + los cambios que aún no han llegado a él, en
 * orden. Así un cambio sin enviar se sigue viendo al recargar, sin tocar la copia guardada.
 */
export function aplicarPendientes(
  pedidos: Pedido[],
  operaciones: { tipo: string; payload: unknown }[],
  ids: Record<string, string>,
): Pedido[] {
  let lista = pedidos;
  for (const original of operaciones) {
    const op = { ...original, payload: sustituirIds(original.payload, ids) } as OperacionPedido;
    switch (op.tipo) {
      case OP_PEDIDO.crear: {
        const pedido = toPedido(op.payload.vista);
        // Ya enviado y en la lista con su id real: no se duplica
        if (!lista.some((p) => p.id === pedido.id || p.id === ids[op.payload.tempId])) {
          lista = [pedido, ...lista];
        }
        break;
      }
      case OP_PEDIDO.estadoLinea: {
        const { lineaId, estado } = op.payload;
        lista = cambiarPedido(lista, op.payload.pedidoId, (pedido) => {
          const linea = pedido.lineas.find((l) => l.id === lineaId);
          return linea ? conLineaPedido(pedido, { ...linea, estado }) : pedido;
        });
        break;
      }
      case OP_PEDIDO.editar: {
        const { maquina, pago, comentarios } = op.payload.cambios;
        lista = cambiarPedido(lista, op.payload.pedidoId, (pedido) => ({
          ...pedido,
          maquina: maquina.trim(),
          pago,
          comentarios: comentarios.trim(),
        }));
        break;
      }
      case OP_PEDIDO.cancelar:
        lista = cambiarPedido(lista, op.payload.pedidoId, (pedido) =>
          pedido.lineas.reduce(cancelarLineaDe, pedido),
        );
        break;
      case OP_PEDIDO.cancelarLinea: {
        const { lineaId } = op.payload;
        lista = cambiarPedido(lista, op.payload.pedidoId, (pedido) => {
          const linea = pedido.lineas.find((l) => l.id === lineaId);
          return linea ? cancelarLineaDe(pedido, linea) : pedido;
        });
        break;
      }
    }
  }
  return lista;
}

const nombre = (pedido: Pedido) => pedido.jugador.name || pedido.jugador.username;

/** Los textos del panel de cambios pendientes. */
export const describir = {
  crear: (vista: PurchasedDto) => {
    const n = vista.lineas.length;
    const jugador = vista.player.name || vista.player.username;
    return `Nuevo pedido de ${jugador} (${n} ${n === 1 ? 'raqueta' : 'raquetas'})`;
  },
  estadoLinea: (pedido: Pedido, linea: LineaPedido, estado: keyof typeof LINE_STATUS) =>
    `«${nombreLinea(linea)}» de ${nombre(pedido)}: ${LINE_STATUS[estado].label}`,
  editar: (pedido: Pedido) => `Editar el pedido de ${nombre(pedido)}`,
  cancelar: (pedido: Pedido) => `Cancelar el pedido de ${nombre(pedido)}`,
  cancelarLinea: (pedido: Pedido, linea: LineaPedido) =>
    `Cancelar «${nombreLinea(linea)}» de ${nombre(pedido)}`,
};

/** A qué pedido afecta una operación (al crear, su id temporal). */
export function pedidoDeOperacion(op: OperacionPedido): string {
  return op.tipo === OP_PEDIDO.crear ? op.payload.tempId : op.payload.pedidoId;
}
