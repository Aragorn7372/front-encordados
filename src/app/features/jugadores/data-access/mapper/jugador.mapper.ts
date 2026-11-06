import { contiene } from '../../../../shared/utils/texto';
import { emailReal, usernameReal } from '../../../../shared/utils/usuario';
import { ContactoRequest, JugadorDto } from '../dto/jugador.dto';
import { ContactoFormValue, Jugador } from '../model/jugador.model';

export function toJugador(dto: JugadorDto): Jugador {
  return {
    id: dto.userId,
    nombre: dto.name || dto.username,
    username: usernameReal(dto.username),
    email: emailReal(dto.email),
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
