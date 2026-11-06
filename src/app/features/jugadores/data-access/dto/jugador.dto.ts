/** Contrato del backend para jugadores (usuarios con rol USER de un torneo). */

/** UserWithIdDto: lo que devuelve GET /api/user/users/{torneo}. Sin teléfono (ENCUERDATU-63). */
export interface JugadorDto {
  userId: string;
  username: string;
  imageUrl: string;
  name: string;
  email: string;
  role: string;
  tournamentId: string | null;
  bonos: number;
}

/** ContactoPostRequestDto. Email y teléfono son opcionales: muchos tenistas no se registran. */
export interface ContactoRequest {
  name: string;
  email: string | null;
  phone: string | null;
  tournamentId: string;
}
