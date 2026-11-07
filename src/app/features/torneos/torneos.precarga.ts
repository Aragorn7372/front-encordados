import { Observable } from 'rxjs';
import { definirPrecarga } from '../../core/offline/precarga';
import { TorneosApi } from './data-access/api/torneos.api';
import { CONSULTA_INICIAL } from './data-access/store/torneos.store';

/** La lista, el detalle y, para quien gestiona, el equipo y los candidatos. */
export const torneosPrecarga = definirPrecarga({
  api: TorneosApi,
  peticiones: (api, { tournamentId, rol }) => {
    const gestiona = rol === 'ADMIN' || rol === 'OWNER';
    if (!gestiona && rol !== 'SUPERVISOR') return [];
    const peticiones: Observable<unknown>[] = [api.list(CONSULTA_INICIAL)];
    // El detalle no admite SUPERVISOR en el backend; /workers, solo quien gestiona
    if (tournamentId && gestiona) {
      peticiones.push(api.get(tournamentId), api.workers(tournamentId));
    }
    if (gestiona) peticiones.push(api.encorders(), api.supervisors());
    if (rol === 'ADMIN') peticiones.push(api.owners());
    return peticiones;
  },
});
