/** Contrato del backend para cordajes (/api/cuerdas). Enums como texto, tal cual. */

export const FORMATOS_CUERDA = ['Reel', 'Set'] as const;
export type FormatoCuerda = (typeof FORMATOS_CUERDA)[number];

export const TIPOS_CUERDA = [
  'Polyester',
  'Multifilament',
  'SyntheticGut',
  'NaturalGut',
  'Hybrid',
] as const;
export type TipoCuerda = (typeof TIPOS_CUERDA)[number];

/** CuerdaResponseDto. */
export interface CuerdaDto {
  id: number;
  tournamentId: string;
  marca: string;
  modelo: string;
  stock: number;
  precio: number;
  stringFormat: FormatoCuerda;
  stringsType: TipoCuerda;
  calibre: number;
  imageUrl: string;
}
