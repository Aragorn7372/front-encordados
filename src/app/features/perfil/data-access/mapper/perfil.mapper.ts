import { toFormData } from '../../../../core/http/form-data';
import { PerfilActual, PerfilFormValue } from '../model/perfil.model';

/**
 * Multipart de PATCH /me con solo lo que cambia: el backend ignora lo que no llega, y así un
 * campo vacío nunca borra nada. El avatar va aparte.
 */
export function toPerfilFormData(
  value: PerfilFormValue,
  actual: PerfilActual,
  avatar: File | null,
): FormData {
  const cambia = (nuevo: string, viejo: string) => {
    const limpio = nuevo.trim();
    return limpio && limpio !== viejo ? limpio : null;
  };
  return toFormData({
    Name: cambia(value.nombre, actual.nombre),
    Username: cambia(value.username, actual.username),
    Email: value.email.trim() || null,
    Telefono: value.telefono.trim() || null,
    Avatar: avatar,
  });
}

/** El token lleva el username: si cambia, hay que volver a entrar para tener uno nuevo. */
export function cambiaUsername(value: PerfilFormValue, actual: PerfilActual): boolean {
  const nuevo = value.username.trim();
  return !!nuevo && nuevo !== actual.username;
}

export function hayCambios(value: PerfilFormValue, actual: PerfilActual, avatar: File | null) {
  return [...toPerfilFormData(value, actual, avatar).keys()].length > 0;
}
