import { decodeJwt, isExpired, CLAIM_ROLE } from './jwt';
import { fakeToken } from './jwt.testing';

describe('decodeJwt', () => {
  it('lee el rol de su claim con URI completa', () => {
    expect(decodeJwt(fakeToken('OWNER'))?.[CLAIM_ROLE]).toBe('OWNER');
  });

  it('decodifica caracteres no ASCII (base64url + UTF-8)', () => {
    expect(decodeJwt(fakeToken('USER', 3600, 'peñón'))?.sub).toBe('peñón');
  });

  it.each([null, '', 'no-es-un-jwt', 'a.%%%.c'])('devuelve null con %s', (token) => {
    expect(decodeJwt(token)).toBeNull();
  });
});

describe('isExpired', () => {
  it('distingue un token vigente de uno caducado', () => {
    expect(isExpired(decodeJwt(fakeToken('USER', 60))!)).toBe(false);
    expect(isExpired(decodeJwt(fakeToken('USER', -60))!)).toBe(true);
  });
});
