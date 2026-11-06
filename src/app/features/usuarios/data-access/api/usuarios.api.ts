import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { SILENT_ERRORS } from '../../../../core/http/error.interceptor';
import { PageResponse, toPageParams } from '../../../../shared/models/page';
import { Role } from '../../../../shared/models/roles';
import { ManifestDto, UsuarioDto } from '../dto/usuario.dto';
import { toUsuario } from '../mapper/usuario.mapper';

const USERS = '/api/user';
const BACKUP = '/api/export';

/** Todos de una vez y búsqueda en el cliente (ENCUERDATU-66). */
export const USUARIOS_MAX = 200;

const silent = () => ({ context: new HttpContext().set(SILENT_ERRORS, true) });
/** El backend espera un string JSON suelto en el cuerpo. */
const json = () => ({ headers: new HttpHeaders({ 'Content-Type': 'application/json' }) });

@Injectable({ providedIn: 'root' })
export class UsuariosApi {
  private readonly http = inject(HttpClient);

  list() {
    return this.http
      .get<PageResponse<UsuarioDto>>(USERS, {
        params: toPageParams({ page: 0, size: USUARIOS_MAX, sortBy: 'name', direction: 'asc' }),
      })
      .pipe(map((page) => ({ usuarios: page.content.map(toUsuario), total: page.totalElements })));
  }

  /** Solo ADMIN, y solo a cuentas USER sin torneo. No se puede deshacer (ENCUERDATU-70). */
  darRol(id: string, rol: Role) {
    return this.http.post<void>(`${USERS}/${id}/roles`, JSON.stringify(rol), {
      ...json(),
      ...silent(),
    });
  }

  /** OWNER: convierte una cuenta en encordador. */
  hacerEncordador(id: string) {
    return this.http.post<void>(`${USERS}/create-encoder`, JSON.stringify(id), json());
  }

  /** Solo ADMIN. Borrado lógico. */
  remove(id: string) {
    return this.http.delete<void>(`${USERS}/${id}`);
  }

  /** Solo ADMIN: la base de datos entera en un zip. */
  exportarBackup() {
    return this.http.get(BACKUP, { observe: 'response', responseType: 'blob' });
  }

  /** Lee qué trae el zip, sin importar nada. */
  manifest(fichero: File) {
    return this.http.post<ManifestDto>(`${BACKUP}/manifest`, conFichero(fichero), silent());
  }

  /** Borra TODA la base de datos y carga el zip. */
  restaurar(fichero: File) {
    return this.http.post<{ message: string }>(`${BACKUP}/import`, conFichero(fichero), silent());
  }
}

function conFichero(fichero: File): FormData {
  const form = new FormData();
  form.append('file', fichero);
  return form;
}
