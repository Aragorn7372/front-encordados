import { Observable } from 'rxjs';
import { definirPrecarga } from '../../core/offline/precarga';
import { PedidosApi } from './data-access/api/pedidos.api';

/** El tablero y lo que hace falta para crear un pedido sin red (jugadores, encordadores). */
export const pedidosPrecarga = definirPrecarga({
  api: PedidosApi,
  peticiones: (api, { tournamentId, rol }) => {
    // El jugador ve sus pedidos de todos los torneos, como en su pantalla
    if (rol === 'USER') return [api.list(null)];
    const peticiones: Observable<unknown>[] = [api.list(tournamentId)];
    if (tournamentId && rol !== 'SUPERVISOR') {
      // Mismos parámetros que el formulario: el ENCORDER no puede leer /workers
      peticiones.push(api.datosNuevoPedido(tournamentId, rol !== 'ENCORDER'));
    }
    return peticiones;
  },
});
