import { LineStatus } from '../../../../shared/models/status';

/** Contrato del backend, con sus nombres y erratas (raquetModel, preStetchV...). */
export interface PedidoUsuarioDto {
  username: string;
  imageUrl: string;
  name: string;
  bonos: number;
}

export interface StringSetupDto {
  stringV: string;
  tensionV: number;
  preStetchV: number;
  stringH: string;
  tensionH: number;
  preStetchH: number;
}

export interface PedidoLineaDto {
  id: string;
  raquetModel: string;
  nudos: number;
  dateString: string;
  logotype: boolean;
  color: string;
  /** Texto en la API; número en los eventos de SignalR, que no usan el conversor de enums. */
  status: LineStatus | number;
  stringSetup: StringSetupDto;
}

export interface PurchasedDto {
  id: string;
  tournamentId: string;
  player: PedidoUsuarioDto;
  encorder: PedidoUsuarioDto;
  machine: string;
  comments: string;
  payStatus: string;
  createdAt: string;
  updatedAt: string;
  price: number;
  lineas: PedidoLineaDto[];
}
