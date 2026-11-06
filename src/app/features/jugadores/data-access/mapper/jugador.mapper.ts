import { contiene } from '../../../../shared/utils/texto';
import { ContactoRequest, JugadorDto } from '../dto/jugador.dto';
import { ContactoFormValue, Jugador } from '../model/jugador.model';

/** Un ULID: 26 caracteres de Crockford base32. Es el username que el backend da a los contactos. */
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function toJugador(dto: JugadorDto): Jugador {
  return {
    id: dto.userId,
    nombre: dto.name || dto.username,
    username: ULID.test(dto.username) ? null : dto.username,
    // Sin email, el backend guarda un GUID: un email de verdad siempre lleva @
    email: dto.email?.includes('@') ? dto.email : null,
    bonos: dto.bonos ?? 0,
    imagen: dto.imageUrl,
  };
}

export function coincideJugador(jugador: Jugador, busqueda: string): boolean {
  return contiene([jugador.nombre, jugador.username, jugador.email], busqueda);
}

const vacioANull = (texto: string) => texto.trim() || null;

export function toContactoRequest(value: ContactoFormValue, tournamentId: string): ContactoRequest {
  return {
    name: value.nombre.trim(),
    email: vacioANull(value.email),
    phone: vacioANull(value.telefono),
    tournamentId,
  };
}

/** Para pegar en un mensaje o una hoja: «Nombre <email>» por línea. Sin teléfono (ENCUERDATU-63). */
export function textoContactos(jugadores: Jugador[]): string {
  return jugadores
    .map((jugador) => (jugador.email ? `${jugador.nombre} <${jugador.email}>` : jugador.nombre))
    .join('\n');
}
