import { definirPrecarga } from '../../core/offline/precarga';
import { CordajesApi } from './data-access/api/cordajes.api';

export const cordajesPrecarga = definirPrecarga({
  api: CordajesApi,
  peticiones: (api, { tournamentId, rol }) =>
    tournamentId && (rol === 'ADMIN' || rol === 'OWNER') ? [api.list(tournamentId)] : [],
});
