import { StatusInfo } from './status';

/**
 * Regla del front, a propósito (ENCUERDATU-47): otro front que no la quiera no tiene por qué
 * cargar con ella en el backend. Con esto o menos, el artículo sale como «Stock bajo».
 */
export const STOCK_BAJO = 5;

export type NivelStock = 'agotado' | 'bajo' | 'ok';

export function nivelStock(stock: number, umbral = STOCK_BAJO): NivelStock {
  if (stock <= 0) return 'agotado';
  return stock <= umbral ? 'bajo' : 'ok';
}

export const NIVEL_STOCK: Record<NivelStock, StatusInfo> = {
  agotado: { label: 'Agotado', tone: 'error' },
  bajo: { label: 'Stock bajo', tone: 'warning' },
  ok: { label: 'En stock', tone: 'success' },
};
