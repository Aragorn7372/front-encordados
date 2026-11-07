import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, map, of } from 'rxjs';
import { SILENT_ERRORS } from '../../../../core/http/error.interceptor';
import { PageResponse, toPageParams } from '../../../../shared/models/page';
import { LineStatus } from '../../../../shared/models/status';
import { PedidoLineaDto, PurchasedDto } from '../dto/pedido.dto';
import { toPedido } from '../mapper/pedido.mapper';
import { CuerpoCambios, PurchasedRequest, cuerpoCambios } from '../mapper/pedido-request';
import { CambiosPedido, Pedido } from '../model/pedido.model';

const BASE = '/api/purchased';
/** El tablero necesita todos los pedidos a la vez, no se puede paginar por columnas. */
export const TABLERO_MAX = 200;

const jsonString = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

/** Lo justo para elegir jugador en el formulario. */
export interface JugadorOpcion {
  username: string;
  name: string;
  bonos: number;
}

export interface EncordadorOpcion {
  username: string;
  name: string;
  maquina: string | null;
}

export interface DatosNuevoPedido {
  jugadores: JugadorOpcion[];
  encordadores: EncordadorOpcion[];
}

interface UsuarioDto {
  username: string;
  name: string;
  bonos: number;
  role?: string;
}

interface DetalleTorneoDto {
  user: UsuarioDto[];
  owner: UsuarioDto | null;
}

interface AsignacionDto {
  machineName: string;
  user: UsuarioDto;
}

export type { CambiosPedido } from '../model/pedido.model';

/** Los formularios pintan sus errores en línea. */
const silent = () => ({ context: new HttpContext().set(SILENT_ERRORS, true) });

export interface PedidosPage {
  pedidos: Pedido[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class PedidosApi {
  private readonly http = inject(HttpClient);

  list(tournamentId: string | null) {
    let params = toPageParams({
      page: 0,
      size: TABLERO_MAX,
      sortBy: 'createdAt',
      direction: 'desc',
    });
    if (tournamentId) params = params.set('tournamentId', tournamentId);

    return this.http.get<PageResponse<PurchasedDto>>(BASE, { params }).pipe(
      map((page): PedidosPage => ({
        pedidos: page.content.map(toPedido),
        total: page.totalElements,
      })),
    );
  }

  create(request: PurchasedRequest) {
    return this.http.post<PurchasedDto>(BASE, request, silent()).pipe(map(toPedido));
  }

  /**
   * Jugadores del torneo y encordadores con su máquina. ENCORDER no puede leer /workers
   * (reservado a OWNER a propósito): el detalle del torneo ya trae los encordadores.
   */
  datosNuevoPedido(tournamentId: string, conMaquinas: boolean) {
    const jugadores = this.http
      .get<PageResponse<UsuarioDto>>(`/api/user/users/${tournamentId}`, {
        params: toPageParams({ page: 0, size: 200 }),
      })
      .pipe(map((page) => page.content.filter((u) => !u.role || u.role === 'USER')));
    const detalle = this.http.get<DetalleTorneoDto>(`/api/tournaments/${tournamentId}`);
    const asignaciones = conMaquinas
      ? this.http.get<AsignacionDto[]>(`/api/tournaments/${tournamentId}/workers`)
      : of<AsignacionDto[]>([]);

    return forkJoin({ jugadores, detalle, asignaciones }).pipe(
      map(({ jugadores, detalle, asignaciones }): DatosNuevoPedido => {
        // El propietario también puede encordar, según el validador del backend
        const personas = [...detalle.user, ...(detalle.owner ? [detalle.owner] : [])];
        const unicos = new Map(personas.map((p) => [p.username, p]));
        return {
          jugadores: jugadores.map(({ username, name, bonos }) => ({ username, name, bonos })),
          encordadores: [...unicos.values()].map((p) => ({
            username: p.username,
            name: p.name,
            maquina: asignaciones.find((a) => a.user.username === p.username)?.machineName ?? null,
          })),
        };
      }),
    );
  }

  get(id: string) {
    return this.http.get<PurchasedDto>(`${BASE}/${id}`).pipe(map(toPedido));
  }

  /** Editar desde el detalle: solo lo que cambia (ver cuerpoCambios). */
  update(pedido: Pedido, cambios: CambiosPedido) {
    return this.put(pedido.id, cuerpoCambios(pedido, cambios));
  }

  /** El cuerpo ya calculado: la cola lo guarda así, sin depender del pedido de entonces. */
  put(id: string, cuerpo: CuerpoCambios) {
    return this.http.put<PurchasedDto>(`${BASE}/${id}`, cuerpo, silent()).pipe(map(toPedido));
  }

  changeLineStatus(lineaId: string, status: LineStatus) {
    return this.http.patch<PedidoLineaDto>(
      `${BASE}/lineas/${lineaId}/status`,
      JSON.stringify(status),
      jsonString,
    );
  }

  /** Cancela las líneas que aún no están terminadas. Avisa al jugador por email y WhatsApp. */
  cancel(id: string) {
    return this.http.patch<PurchasedDto>(`${BASE}/cancel/${id}`, null).pipe(map(toPedido));
  }

  cancelLine(lineaId: string) {
    return this.http.patch<PedidoLineaDto>(`${BASE}/lineas/${lineaId}/cancel`, null);
  }
}
