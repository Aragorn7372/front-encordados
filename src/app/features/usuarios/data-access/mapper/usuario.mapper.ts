import { Role, isRole } from '../../../../shared/models/roles';
import { contiene } from '../../../../shared/utils/texto';
import { emailReal, usernameReal } from '../../../../shared/utils/usuario';
import { UsuarioDto } from '../dto/usuario.dto';
import { Grupo, Usuario } from '../model/usuario.model';

export function toUsuario(dto: UsuarioDto): Usuario {
  const rol = dto.role?.toUpperCase();
  return {
    id: dto.userId,
    nombre: dto.name || dto.username,
    username: usernameReal(dto.username),
    email: emailReal(dto.email),
    rol: isRole(rol) ? rol : null,
    torneoId: dto.tournamentId,
    imagen: dto.imageUrl,
  };
}

export function grupoDe(usuario: Usuario): Grupo {
  switch (usuario.rol) {
    case 'ENCORDER':
      return 'encordadores';
    case 'SUPERVISOR':
      return 'supervisores';
    case 'OWNER':
    case 'ADMIN':
      return 'propietarios';
    default:
      return usuario.torneoId ? 'jugadores' : 'sin-rol';
  }
}

/** El backend solo cambia el rol de cuentas USER sin torneo (ENCUERDATU-70, -71). */
export const esSinRol = (usuario: Usuario) => grupoDe(usuario) === 'sin-rol';

/**
 * Las pestañas de cada rol. El OWNER ve encordadores, supervisores, jugadores y cuentas sin rol:
 * así encuentra a quien ya trabajó en otro taller (sustituciones) sin pedirle una cuenta nueva.
 * Propietarios y administradores, solo el ADMIN. Se filtra aquí porque el backend le manda todo
 * (ENCUERDATU-72, -88).
 */
export function gruposVisibles(rol: Role | null | undefined): Grupo[] {
  const comunes: Grupo[] = ['encordadores', 'supervisores', 'jugadores', 'sin-rol'];
  return rol === 'ADMIN' ? [...comunes, 'propietarios'] : comunes;
}

export function coincideUsuario(usuario: Usuario, busqueda: string): boolean {
  return contiene([usuario.nombre, usuario.username, usuario.email], busqueda);
}
