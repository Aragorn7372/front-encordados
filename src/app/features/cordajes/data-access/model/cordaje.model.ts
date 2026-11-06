import { FormatoCuerda, TipoCuerda } from '../dto/cordaje.dto';

export interface Cordaje {
  id: number;
  marca: string;
  modelo: string;
  stock: number;
  precio: number;
  formato: FormatoCuerda;
  tipo: TipoCuerda;
  /** En milímetros, por ejemplo 1,25. */
  calibre: number;
  imagen: string;
}

export interface CordajeFormValue {
  marca: string;
  modelo: string;
  stock: number;
  precio: number;
  formato: FormatoCuerda;
  tipo: TipoCuerda;
  calibre: number;
  /** Solo si se elige una nueva: sin ella se conserva la actual. */
  imagen: File | null;
}

export const FORMATO_LABEL: Record<FormatoCuerda, string> = {
  Reel: 'Bobina',
  Set: 'Set individual',
};

export const TIPO_LABEL: Record<TipoCuerda, string> = {
  Polyester: 'Poliéster',
  Multifilament: 'Multifilamento',
  SyntheticGut: 'Tripa sintética',
  NaturalGut: 'Tripa natural',
  Hybrid: 'Híbrido',
};
