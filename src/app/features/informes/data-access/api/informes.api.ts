import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { PageResponse, toPageParams } from '../../../../shared/models/page';
import { PedidoInformeDto } from '../dto/informe.dto';
import { toPedidoInforme } from '../mapper/informe.mapper';

/** Las estadísticas se calculan en el front: el backend no tiene endpoint de informes. */
export const INFORME_MAX = 500;

@Injectable({ providedIn: 'root' })
export class InformesApi {
  private readonly http = inject(HttpClient);

  /** Sin torneo solo vale para ADMIN: OWNER y SUPERVISOR reciben 403. */
  pedidos(tournamentId: string | null) {
    let params = toPageParams({
      page: 0,
      size: INFORME_MAX,
      sortBy: 'createdAt',
      direction: 'desc',
    });
    if (tournamentId) params = params.set('tournamentId', tournamentId);
    return this.http
      .get<PageResponse<PedidoInformeDto>>('/api/purchased', { params })
      .pipe(
        map((page) => ({ pedidos: page.content.map(toPedidoInforme), total: page.totalElements })),
      );
  }
}
