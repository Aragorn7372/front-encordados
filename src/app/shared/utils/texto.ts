/** Minúsculas y sin acentos: «Martínez» y «MARTINEZ» se comparan igual. */
export const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * Búsqueda en cliente: ¿alguno de los campos contiene el término, en cualquier posición?
 * Sin término coincide todo. Sustituye a búsquedas del backend que no sirven (ENCUERDATU-26, -66).
 */
export function contiene(campos: (string | null | undefined)[], busqueda: string): boolean {
  const termino = normalizar(busqueda.trim());
  if (!termino) return true;
  return campos.some((campo) => normalizar(campo ?? '').includes(termino));
}
