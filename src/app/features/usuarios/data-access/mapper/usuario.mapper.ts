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
    case 'SUPERVISOR':
      return 'staff';
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
 * Lo que ve cada rol. El OWNER, su gente y las cuentas que puede convertir en encordador.
 * Se filtra aquí porque el backend le manda todo (ENCUERDATU-72).
 */
export function gruposVisibles(rol: Role | null | undefined): Grupo[] {
  return rol === 'ADMIN' ? ['sin-rol', 'staff', 'propietarios', 'jugadores'] : ['sin-rol', 'staff'];
}

export function coincideUsuario(usuario: Usuario, busqueda: string): boolean {
  return contiene([usuario.nombre, usuario.username, usuario.email], busqueda);
}
