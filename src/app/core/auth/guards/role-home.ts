import { Role } from '../../../shared/models/roles';

const HOME: Record<Role, string> = {
  ADMIN: '/pedidos',
  OWNER: '/pedidos',
  SUPERVISOR: '/informes',
  ENCORDER: '/mis-asignados',
  USER: '/mis-pedidos',
};

export function homeFor(role: Role): string {
  return HOME[role];
}
