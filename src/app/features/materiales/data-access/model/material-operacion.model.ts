import { MaterialFormValue } from './material.model';

/**
 * Las escrituras de materiales que pueden hacerse sin conexión: editar (también el ± de stock, que
 * envía el material entero) y borrar. Crear pide conexión: el id lo da el servidor y es un número.
 */
export const OP_MATERIAL = {
  editar: 'material.editar',
  borrar: 'material.borrar',
} as const;

export interface EditarMaterial {
  id: number;
  /** Con la imagen nueva si se eligió (un File se guarda tal cual en IndexedDB). */
  value: MaterialFormValue;
}

export interface BorrarMaterial {
  id: number;
}
