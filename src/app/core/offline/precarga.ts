import { Type } from '@angular/core';
import { Observable } from 'rxjs';
import { Role } from '../../shared/models/roles';

export interface ContextoPrecarga {
  /** null para el jugador (sus pedidos son de cualquier torneo) o el ADMIN sin torneo. */
  tournamentId: string | null;
  rol: Role;
}

/**
 * Lo que una feature quiere tener guardado de un torneo. Se piden con su propio cliente
 * (`api`), así la URL es exactamente la que pedirá su pantalla, que es la clave de la copia.
 * Cada feature decide qué peticiones tienen sentido para cada rol: las que el backend no
 * deja hacer no se piden.
 */
export interface Precarga<T = unknown> {
  api: Type<T>;
  peticiones(api: T, contexto: ContextoPrecarga): Observable<unknown>[];
}

/** Con el tipo de su API, para que `peticiones` sepa qué cliente recibe. */
export function definirPrecarga<T>(precarga: Precarga<T>): Precarga<T> {
  return precarga;
}
