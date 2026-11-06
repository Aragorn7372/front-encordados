/** Contrato del backend para materiales (/api/materials). */

export const TIPOS_MATERIAL = [
  'Grip',
  'Overgrip',
  'LeadTape',
  'Silicone',
  'Bumper',
  'Otro',
] as const;
export type TipoMaterial = (typeof TIPOS_MATERIAL)[number];

/** MaterialResponseDto. Ojo: la petición llama `Type` a lo que aquí es `materialType`. */
export interface MaterialDto {
  id: number;
  tournamentId: string;
  marca: string;
  modelo: string;
  stock: number;
  precio: number;
  materialType: TipoMaterial;
  imageUrl: string;
}
