import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { SILENT_ERRORS } from '../../../../core/http/error.interceptor';
import { PageResponse, toPageParams } from '../../../../shared/models/page';
import { CuerdaDto } from '../dto/cordaje.dto';
import { toCordaje, toCuerdaFormData } from '../mapper/cordaje.mapper';
import { CordajeFormValue } from '../model/cordaje.model';

const BASE = '/api/cuerdas';

/** Todo el torneo de una vez y búsqueda en el cliente: la del backend es por prefijo. */
export const CORDAJES_MAX = 200;

/** Los formularios pintan sus errores en línea. */
const silent = () => ({ context: new HttpContext().set(SILENT_ERRORS, true) });

@Injectable({ providedIn: 'root' })
export class CordajesApi {
  private readonly http = inject(HttpClient);

  list(tournamentId: string) {
    return this.http
      .get<PageResponse<CuerdaDto>>(BASE, {
        params: toPageParams({
          page: 0,
          size: CORDAJES_MAX,
          sortBy: 'marca',
          direction: 'asc',
        }).set('tournamentId', tournamentId),
      })
      .pipe(map((page) => ({ cordajes: page.content.map(toCordaje), total: page.totalElements })));
  }

  create(tournamentId: string, value: CordajeFormValue) {
    return this.http
      .post<CuerdaDto>(BASE, toCuerdaFormData(value, tournamentId), silent())
      .pipe(map(toCordaje));
  }

  /** Desde el formulario, `silencioso`: él pinta el error. Desde el ± de stock, el toast. */
  update(id: number, value: CordajeFormValue, silencioso = false) {
    return this.http
      .put<CuerdaDto>(`${BASE}/${id}`, toCuerdaFormData(value), silencioso ? silent() : {})
      .pipe(map(toCordaje));
  }

  remove(id: number) {
    return this.http.delete<void>(`${BASE}/${id}`);
  }
}
