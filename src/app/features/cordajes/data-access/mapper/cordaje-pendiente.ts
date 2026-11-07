import { BorrarCordaje, EditarCordaje, OP_CORDAJE } from '../model/cordaje-operacion.model';
import { Cordaje, CordajeFormValue } from '../model/cordaje.model';

/** Los campos que cambia una edición. La imagen nueva se verá cuando llegue al servidor. */
function conCambios(cordaje: Cordaje, value: CordajeFormValue): Cordaje {
  return {
    ...cordaje,
    marca: value.marca.trim(),
    modelo: value.modelo.trim(),
    stock: value.stock,
    precio: value.precio,
    formato: value.formato,
    tipo: value.tipo,
    calibre: value.calibre,
  };
}

/**
 * Lo que se ve = lo del servidor (o su copia) + los cambios de la cola que aún no han llegado,
 * en orden. Igual que en pedidos: la copia guardada no se toca.
 */
export function aplicarPendientes(
  lista: Cordaje[],
  operaciones: { tipo: string; payload: unknown }[],
): Cordaje[] {
  let resultado = lista;
  for (const op of operaciones) {
    if (op.tipo === OP_CORDAJE.editar) {
      const { id, value } = op.payload as EditarCordaje;
      resultado = resultado.map((x) => (x.id === id ? conCambios(x, value) : x));
    } else if (op.tipo === OP_CORDAJE.borrar) {
      const { id } = op.payload as BorrarCordaje;
      resultado = resultado.filter((x) => x.id !== id);
    }
  }
  return resultado;
}

/** A qué cordaje afecta, para marcarlo «sin enviar». */
export function cordajeDeOperacion(op: { tipo: string; payload: unknown }): number | null {
  const tipos: string[] = Object.values(OP_CORDAJE);
  return tipos.includes(op.tipo) ? (op.payload as { id: number }).id : null;
}

const nombre = (x: Cordaje) => `${x.marca} ${x.modelo}`;

/** Los textos del panel de cambios pendientes. */
export const describir = {
  stock: (x: Cordaje, stock: number) => `Stock de ${nombre(x)}: ${stock}`,
  editar: (x: Cordaje) => `Editar ${nombre(x)}`,
  borrar: (x: Cordaje) => `Borrar ${nombre(x)}`,
};
