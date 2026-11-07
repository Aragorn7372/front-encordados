import { definirPrecarga } from '../../core/offline/precarga';
import { MaterialesApi } from './data-access/api/materiales.api';

export const materialesPrecarga = definirPrecarga({
  api: MaterialesApi,
  peticiones: (api, { tournamentId, rol }) =>
    tournamentId && (rol === 'ADMIN' || rol === 'OWNER') ? [api.list(tournamentId)] : [],
});
