import { LineStatus, PaymentStatus } from '../../../../shared/models/status';

/** Lo que Informes necesita de PurchasedResponseDto; el resto del pedido se ignora. */
export interface UsuarioInformeDto {
  username: string;
  name: string;
  imageUrl: string;
}

export interface PedidoInformeDto {
  id: string;
  tournamentId: string;
  player: UsuarioInformeDto;
  encorder: UsuarioInformeDto;
  payStatus: PaymentStatus;
  price: number;
  createdAt: string;
  /** En los eventos de SignalR el estado llega como número. */
  lineas: { status: LineStatus | number }[] | null;
}
