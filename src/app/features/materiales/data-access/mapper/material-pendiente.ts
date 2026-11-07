import { BorrarMaterial, EditarMaterial, OP_MATERIAL } from '../model/material-operacion.model';
import { Material, MaterialFormValue } from '../model/material.model';

/** Los campos que cambia una edición. La imagen nueva se verá cuando llegue al servidor. */
function conCambios(material: Material, value: MaterialFormValue): Material {
  return {
    ...material,
    marca: value.marca.trim(),
    modelo: value.modelo.trim(),
    stock: value.stock,
    precio: value.precio,
    tipo: value.tipo,
  };
}

/**
 * Lo que se ve = lo del servidor (o su copia) + los cambios de la cola que aún no han llegado,
 * en orden. Igual que en pedidos: la copia guardada no se toca.
 */
export function aplicarPendientes(
  lista: Material[],
  operaciones: { tipo: string; payload: unknown }[],
): Material[] {
  let resultado = lista;
  for (const op of operaciones) {
    if (op.tipo === OP_MATERIAL.editar) {
      const { id, value } = op.payload as EditarMaterial;
      resultado = resultado.map((x) => (x.id === id ? conCambios(x, value) : x));
    } else if (op.tipo === OP_MATERIAL.borrar) {
      const { id } = op.payload as BorrarMaterial;
      resultado = resultado.filter((x) => x.id !== id);
    }
  }
  return resultado;
}

/** A qué material afecta, para marcarlo «sin enviar». */
export function materialDeOperacion(op: { tipo: string; payload: unknown }): number | null {
  const tipos: string[] = Object.values(OP_MATERIAL);
  return tipos.includes(op.tipo) ? (op.payload as { id: number }).id : null;
}

const nombre = (x: Material) => `${x.marca} ${x.modelo}`;

/** Los textos del panel de cambios pendientes. */
export const describir = {
  stock: (x: Material, stock: number) => `Stock de ${nombre(x)}: ${stock}`,
  editar: (x: Material) => `Editar ${nombre(x)}`,
  borrar: (x: Material) => `Borrar ${nombre(x)}`,
};
