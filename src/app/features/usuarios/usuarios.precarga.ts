import { definirPrecarga } from '../../core/offline/precarga';
import { UsuariosApi } from './data-access/api/usuarios.api';

export const usuariosPrecarga = definirPrecarga({
  api: UsuariosApi,
  peticiones: (api, { rol }) => (rol === 'ADMIN' || rol === 'OWNER' ? [api.list()] : []),
});
