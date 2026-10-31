import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { toFormData } from '../../../core/http/form-data';
import { SILENT_ERRORS } from '../../../core/http/error.interceptor';
import { PageQuery, PageResponse, toPageParams } from '../../../shared/models/page';
import { TournamentSummary } from '../../../shared/models/tournament';
import { endOfDay, startOfDay, toTournamentDetails } from './torneos.mapper';
import {
  StaffUser,
  TournamentDetailsDto,
  TournamentFormValue,
  WorkerAssignment,
} from './torneos.models';

const BASE = '/api/tournaments';
const USERS = '/api/user';
const STAFF_PAGE = { page: 0, size: 200 };

/** Los formularios pintan sus errores en línea. */
const silent = () => ({ context: new HttpContext().set(SILENT_ERRORS, true) });

/** El backend espera un string JSON suelto en algunos PATCH. */
const jsonString = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

@Injectable({ providedIn: 'root' })
export class TorneosApi {
  private readonly http = inject(HttpClient);

  list(query: PageQuery) {
    return this.http.get<PageResponse<TournamentSummary>>(BASE, {
      params: toPageParams(query, 'pageSize'),
    });
  }

  get(id: string) {
    return this.http.get<TournamentDetailsDto>(`${BASE}/${id}`).pipe(map(toTournamentDetails));
  }

  /** ADMIN indica el propietario; OWNER crea torneos a su nombre. */
  create(value: TournamentFormValue, asAdmin: boolean) {
    const form = toFormData({
      Name: value.name,
      StartTournament: startOfDay(value.startDate),
      EndTournament: endOfDay(value.endDate),
      Logotype: value.logo,
      OwnerId: asAdmin ? value.ownerId : null,
    });
    return this.http.post<unknown>(asAdmin ? BASE : `${BASE}/owner-create`, form, silent());
  }

  update(id: string, value: TournamentFormValue) {
    const form = toFormData({
      Name: value.name,
      StartTournament: startOfDay(value.startDate),
      EndTournament: endOfDay(value.endDate),
      Logotype: value.logo,
    });
    return this.http.put<TournamentSummary>(`${BASE}/${id}`, form, silent());
  }

  remove(id: string) {
    return this.http.delete<void>(`${BASE}/${id}`);
  }

  workers(id: string) {
    return this.http.get<WorkerAssignment[]>(`${BASE}/${id}/workers`);
  }

  addWorker(id: string, userId: string, machineName: string) {
    return this.http.patch<unknown>(`${BASE}/add-worker/${id}`, { userId, machineName }, silent());
  }

  removeWorker(id: string, userId: string) {
    return this.http.patch<unknown>(
      `${BASE}/remove-worker/${id}`,
      JSON.stringify(userId),
      jsonString,
    );
  }

  assignSupervisor(tournamentId: string, supervisorId: string) {
    return this.http.patch<unknown>(
      `${BASE}/assign-supervisor`,
      { tournamentId, supervisorId },
      silent(),
    );
  }

  removeSupervisor(tournamentId: string, supervisorId: string) {
    return this.http.patch<unknown>(`${BASE}/remove-supervisor`, { tournamentId, supervisorId });
  }

  encorders() {
    return this.staff(`${USERS}/encorders`);
  }

  supervisors() {
    return this.staff(`${USERS}/supervisors`);
  }

  /** No hay filtro de propietarios en el backend: se filtra sobre el listado de usuarios. */
  owners() {
    return this.staff(USERS).pipe(map((users) => users.filter((u) => u.role === 'OWNER')));
  }

  private staff(url: string) {
    return this.http
      .get<PageResponse<StaffUser>>(url, { params: toPageParams(STAFF_PAGE) })
      .pipe(map((page) => page.content));
  }
}
