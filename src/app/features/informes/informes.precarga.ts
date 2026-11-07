import { definirPrecarga } from '../../core/offline/precarga';
import { InformesApi } from './data-access/api/informes.api';

export const informesPrecarga = definirPrecarga({
  api: InformesApi,
  peticiones: (api, { tournamentId, rol }) =>
    ['ADMIN', 'OWNER', 'SUPERVISOR'].includes(rol) ? [api.pedidos(tournamentId)] : [],
});
