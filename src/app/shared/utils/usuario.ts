/**
 * Un contacto creado sin cuenta lleva relleno del backend: un ULID como username y un GUID
 * como email (UserMapper.ToModel). Aquí se convierten en null para no enseñarlos.
 */

/** 26 caracteres de Crockford base32. */
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function usernameReal(username: string | null | undefined): string | null {
  return username && !ULID.test(username) ? username : null;
}

/** Un email de verdad siempre lleva @; el GUID de relleno, no. */
export function emailReal(email: string | null | undefined): string | null {
  return email?.includes('@') ? email : null;
}
