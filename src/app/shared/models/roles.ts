export const ROLES = ['ADMIN', 'OWNER', 'SUPERVISOR', 'ENCORDER', 'USER'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  OWNER: 'Propietario',
  SUPERVISOR: 'Supervisor',
  ENCORDER: 'Encordador',
  USER: 'Jugador',
};

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}
