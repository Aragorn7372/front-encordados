import { inject } from '@angular/core';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { PedidoLineaDto } from '../data-access/dto/pedido.dto';
import { LineaPedido, Pedido } from '../data-access/model/pedido.model';
import { PedidosEscrituras } from '../data-access/store/pedidos-escrituras';

/**
 * Cancelar con confirmación, igual desde la tarjeta que desde el detalle.
 * Se llaman en un contexto de inyección y devuelven la acción: el resultado del servidor,
 * o null si no se confirma, si falla (ya se ha avisado) o si queda en la cola sin conexión
 * (entonces el tablero ya lo muestra cancelado).
 */
export function injectCancelarPedido(): (pedido: Pedido) => Promise<Pedido | null> {
  const escrituras = inject(PedidosEscrituras);
  const confirm = inject(ConfirmService);

  return async (pedido) => {
    const ok = await confirm.ask({
      title: 'Cancelar pedido',
      message: `Se cancelarán las raquetas de ${pedido.jugador.name || pedido.jugador.username} que aún no están terminadas y se le avisará.`,
      confirmText: 'Cancelar pedido',
      cancelText: 'Volver',
      danger: true,
    });
    if (!ok) return null;
    try {
      return await escrituras.cancelar(pedido);
    } catch {
      return null;
    }
  };
}

export function injectCancelarLinea(): (
  pedido: Pedido,
  linea: LineaPedido,
) => Promise<PedidoLineaDto | null> {
  const escrituras = inject(PedidosEscrituras);
  const confirm = inject(ConfirmService);

  return async (pedido, linea) => {
    const nombre = linea.tipo === 'encordado' ? linea.raqueta : linea.articulo;
    const ok = await confirm.ask({
      title: 'Cancelar raqueta',
      message: `¿Cancelar «${nombre}»? El resto del pedido sigue igual. Se avisará al jugador.`,
      confirmText: 'Cancelar raqueta',
      cancelText: 'Volver',
      danger: true,
    });
    if (!ok) return null;
    try {
      return await escrituras.cancelarLinea(pedido, linea);
    } catch {
      return null;
    }
  };
}
