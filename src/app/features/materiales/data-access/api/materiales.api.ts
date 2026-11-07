import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { SILENT_ERRORS } from '../../../../core/http/error.interceptor';
import { PageResponse, toPageParams } from '../../../../shared/models/page';
import { MaterialDto } from '../dto/material.dto';
import { toMaterial, toMaterialFormData } from '../mapper/material.mapper';
import { MaterialFormValue } from '../model/material.model';

const BASE = '/api/materials';

/** Todo el torneo de una vez y búsqueda en el cliente: la del backend es por prefijo. */
export const MATERIALES_MAX = 200;

/** Los formularios pintan sus errores en línea. */
const silent = () => ({ context: new HttpContext().set(SILENT_ERRORS, true) });

@Injectable({ providedIn: 'root' })
export class MaterialesApi {
  private readonly http = inject(HttpClient);

  list(tournamentId: string) {
    return this.http
      .get<PageResponse<MaterialDto>>(BASE, {
        params: toPageParams({
          page: 0,
          size: MATERIALES_MAX,
          sortBy: 'marca',
          direction: 'asc',
        }).set('tournamentId', tournamentId),
      })
      .pipe(
        map((page) => ({ materiales: page.content.map(toMaterial), total: page.totalElements })),
      );
  }

  create(tournamentId: string, value: MaterialFormValue) {
    return this.http
      .post<MaterialDto>(BASE, toMaterialFormData(value, tournamentId), silent())
      .pipe(map(toMaterial));
  }

  /**
   * Silencioso: lo envía la cola (ver MaterialesEscrituras), que avisa ella del error. El
   * formulario lo pinta en línea y el ± de stock, en un toast.
   */
  update(id: number, value: MaterialFormValue) {
    return this.http
      .put<MaterialDto>(`${BASE}/${id}`, toMaterialFormData(value), silent())
      .pipe(map(toMaterial));
  }

  remove(id: number) {
    return this.http.delete<void>(`${BASE}/${id}`);
  }
}
