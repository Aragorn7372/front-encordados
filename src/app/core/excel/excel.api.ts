import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SILENT_ERRORS } from '../http/error.interceptor';
import { ExcelImportResult, ExcelTipo } from './excel.model';

const BASE = '/api/excel/advanced';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Un único cliente para el Excel de todas las pantallas (antes había 7 copias).
 * Solo OWNER (sus torneos) y ADMIN. La exportación simple (/api/excel/export) es solo
 * para el SUPERVISOR del torneo: ni su propietario puede usarla.
 */
@Injectable({ providedIn: 'root' })
export class ExcelApi {
  private readonly http = inject(HttpClient);

  exportar(tournamentId: string, tipos: ExcelTipo[]) {
    return this.http.get(`${BASE}/export`, {
      params: { tournamentId, types: tipos.join(',') },
      observe: 'response',
      responseType: 'blob',
      // También JSON: si solo se acepta Excel, un error llega como 406 y sin su mensaje
      headers: { Accept: `${XLSX}, application/json` },
    });
  }

  /** La única que puede usar el SUPERVISOR, y solo de su torneo: todo el torneo en un Excel. */
  exportarSimple(tournamentId: string) {
    return this.http.get(`/api/excel/export/${tournamentId}`, {
      observe: 'response',
      responseType: 'blob',
      headers: { Accept: `${XLSX}, application/json` },
    });
  }

  /**
   * Errores silenciosos: el backend responde 403 si el torneo no es tuyo, y el interceptor
   * llevaría a la página de acceso denegado. Mejor mostrarlo en el resultado.
   */
  importar(tournamentId: string, tipos: ExcelTipo[], fichero: File) {
    const form = new FormData();
    form.append('file', fichero);
    return this.http.post<ExcelImportResult>(`${BASE}/import`, form, {
      params: { tournamentId, types: tipos.join(',') },
      context: new HttpContext().set(SILENT_ERRORS, true),
    });
  }
}
