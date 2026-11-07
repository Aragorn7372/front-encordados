/**
 * Lo que llevan los códigos de un pedido y cómo se leen. Lo comparten quien los genera
 * (detalle del pedido, y las pegatinas de la lección 14) y el escáner.
 *
 * - QR: una URL a `/escanear?codigo=<id>`. Con la cámara normal del móvil abre la app.
 * - Código de barras (CODE128): el id tal cual. Los ULID son 26 caracteres en mayúsculas.
 */
export const RUTA_ESCANER = '/escanear';

export function textoQr(id: string, origen: string): string {
  return `${origen}${RUTA_ESCANER}?codigo=${encodeURIComponent(id)}`;
}

export function textoBarras(id: string): string {
  return id.toUpperCase();
}

export type CodigoLeido = { tipo: 'pedido'; id: string } | { tipo: 'desconocido'; texto: string };

/** Un ULID: 26 caracteres del alfabeto de Crockford (sin I, L, O ni U). */
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

/**
 * Entiende los códigos nuevos y también los del front antiguo, que ya pueden estar pegados
 * en raquetas: el QR con un JSON `{ type: 'pedido', id }` y la URL con `openPedido`.
 */
export function leerCodigo(texto: string): CodigoLeido {
  const limpio = texto.trim();
  const id = idDeUrl(limpio) ?? idDeJson(limpio) ?? limpio;
  return ULID.test(id)
    ? { tipo: 'pedido', id: id.toUpperCase() }
    : { tipo: 'desconocido', texto: limpio };
}

function idDeUrl(texto: string): string | null {
  if (!/^https?:\/\//i.test(texto)) return null;
  try {
    const url = new URL(texto);
    return url.searchParams.get('codigo') ?? url.searchParams.get('openPedido');
  } catch {
    return null;
  }
}

function idDeJson(texto: string): string | null {
  if (!texto.startsWith('{')) return null;
  try {
    const datos = JSON.parse(texto) as { type?: unknown; id?: unknown };
    return datos.type === 'pedido' && typeof datos.id === 'string' ? datos.id : null;
  } catch {
    return null;
  }
}
