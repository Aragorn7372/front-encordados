import { TipoMaterial } from '../dto/material.dto';

export interface Material {
  id: number;
  marca: string;
  modelo: string;
  stock: number;
  precio: number;
  tipo: TipoMaterial;
  imagen: string;
}

export interface MaterialFormValue {
  marca: string;
  modelo: string;
  stock: number;
  precio: number;
  tipo: TipoMaterial;
  /** Solo si se elige una nueva: sin ella se conserva la actual. */
  imagen: File | null;
}

export const TIPO_MATERIAL_LABEL: Record<TipoMaterial, string> = {
  Grip: 'Grip',
  Overgrip: 'Overgrip',
  LeadTape: 'Cinta de plomo',
  Silicone: 'Silicona',
  Bumper: 'Protector (bumper)',
  Otro: 'Otro',
};
