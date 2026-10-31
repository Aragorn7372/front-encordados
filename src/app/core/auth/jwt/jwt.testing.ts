import { CLAIM_ID, CLAIM_ROLE } from './jwt';
import { Role } from '../../../shared/models/roles';

/** Crea un JWT sin firma válida para los tests. `expiresIn` va en segundos desde Date.now(). */
export function fakeToken(role: Role = 'USER', expiresIn = 3600, sub = 'rafa'): string {
  const payload = {
    sub,
    email: `${sub}@test.dev`,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    [CLAIM_ROLE]: role,
    [CLAIM_ID]: '01JTEST',
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const base64 = btoa(String.fromCharCode(...bytes));
  return `header.${base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.firma`;
}
