import { definirPrecarga } from '../../core/offline/precarga';
import { JugadoresApi } from './data-access/api/jugadores.api';

export const jugadoresPrecarga = definirPrecarga({
  api: JugadoresApi,
  peticiones: (api, { tournamentId, rol }) =>
    tournamentId && ['ADMIN', 'OWNER', 'ENCORDER'].includes(rol) ? [api.list(tournamentId)] : [],
});
