export const CLAIM_ROLE = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
export const CLAIM_ID = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';

/** Payload del JWT. El backend usa MapInboundClaims=false: rol e id llegan con la URI completa. */
export interface JwtClaims {
  sub: string;
  email: string;
  exp: number;
  [CLAIM_ROLE]: string;
  [CLAIM_ID]: string;
}

/** Decodifica el payload sin validar la firma: eso solo puede hacerlo el backend. */
export function decodeJwt(token: string | null): JwtClaims | null {
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as JwtClaims;
  } catch {
    return null;
  }
}

export function isExpired(claims: JwtClaims, now = Date.now()): boolean {
  return claims.exp * 1000 <= now;
}
