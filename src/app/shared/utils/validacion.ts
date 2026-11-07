/**
 * Reglas de formato comunes a todos los formularios. Sin solapes entre partes, para que la
 * expresión no se dispare con textos largos (backtracking).
 */
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/** La misma regla que UserRequestDto: con prefijo internacional y sin el +. */
const TELEFONO = /^[1-9]\d{6,14}$/;

export function esEmail(texto: string): boolean {
  return EMAIL.test(texto.trim());
}

/** Se aceptan espacios, guiones y el + inicial: el backend los quita. */
export function esTelefono(texto: string): boolean {
  return TELEFONO.test(texto.replace(/[\s\-+]/g, ''));
}

/** Para validadores de Signal Forms: un campo opcional vale vacío o bien escrito. */
export const opcional = (texto: string, regla: (t: string) => boolean) =>
  !texto.trim() || regla(texto);
