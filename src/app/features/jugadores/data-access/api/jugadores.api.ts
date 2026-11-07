import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { toFormData } from '../../../../core/http/form-data';
import { SILENT_ERRORS } from '../../../../core/http/error.interceptor';
import { PageResponse, toPageParams } from '../../../../shared/models/page';
import { ContactoCreado } from '../../../../shared/models/contacto-pendiente';
import { ContactoRequest, JugadorDto } from '../dto/jugador.dto';
import { toJugador } from '../mapper/jugador.mapper';
import { JugadorEdicionValue } from '../model/jugador.model';

const BASE = '/api/user';

/**
 * Se cargan todos de una vez y se busca en el cliente: la búsqueda del backend es por prefijo
 * y distingue mayúsculas (ENCUERDATU-66), y un torneo no tiene tantos jugadores.
 */
export const JUGADORES_MAX = 200;

/** Los formularios pintan sus errores en línea. */
const silent = () => ({ context: new HttpContext().set(SILENT_ERRORS, true) });

@Injectable({ providedIn: 'root' })
export class JugadoresApi {
  private readonly http = inject(HttpClient);

  /** Solo los de rol USER: el endpoint ya filtra por jugadores. */
  list(tournamentId: string) {
    return this.http
      .get<PageResponse<JugadorDto>>(`${BASE}/users/${tournamentId}`, {
        params: toPageParams({ page: 0, size: JUGADORES_MAX, sortBy: 'name', direction: 'asc' }),
      })
      .pipe(map((page) => ({ jugadores: page.content.map(toJugador), total: page.totalElements })));
  }

  createContact(request: ContactoRequest) {
    return this.http.post<ContactoCreado>(`${BASE}/create-contact`, request, silent());
  }

  /** El backend solo suma (cantidad > 0) y solo deja a OWNER y ADMIN (ENCUERDATU-64). */
  addBonos(id: string, cantidad: number) {
    return this.http.post<unknown>(`${BASE}/${id}/bonos`, cantidad, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      ...silent(),
    });
  }

  /** Solo ADMIN (ENCUERDATU-65). Multipart, y lo vacío no se envía para no borrar nada. */
  update(id: string, value: JugadorEdicionValue) {
    const form = toFormData({
      Name: value.nombre.trim() || null,
      Email: value.email.trim() || null,
      Telefono: value.telefono.trim() || null,
    });
    return this.http.patch<unknown>(`${BASE}/${id}`, form, silent());
  }

  /** Solo ADMIN. Borrado lógico en el backend. */
  remove(id: string) {
    return this.http.delete<void>(`${BASE}/${id}`);
  }
}
