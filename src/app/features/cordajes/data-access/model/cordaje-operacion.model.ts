import { CordajeFormValue } from './cordaje.model';

/**
 * Las escrituras de cordajes que pueden hacerse sin conexión: editar (también el ± de stock, que
 * envía el cordaje entero) y borrar. Crear pide conexión: el id lo da el servidor y es un número.
 */
export const OP_CORDAJE = {
  editar: 'cordaje.editar',
  borrar: 'cordaje.borrar',
} as const;

export interface EditarCordaje {
  id: number;
  /** Con la imagen nueva si se eligió (un File se guarda tal cual en IndexedDB). */
  value: CordajeFormValue;
}

export interface BorrarCordaje {
  id: number;
}
