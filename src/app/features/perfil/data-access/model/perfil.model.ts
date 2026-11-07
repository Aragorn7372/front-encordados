/** Lo que el usuario puede cambiar de sí mismo (UserRequestDto). */
export interface PerfilFormValue {
  nombre: string;
  username: string;
  /** Vacío = no cambiarlo: /me no devuelve el actual (ENCUERDATU-76). */
  email: string;
  telefono: string;
}

/** Lo que había al abrir el perfil, para enviar solo lo que cambia. */
export interface PerfilActual {
  nombre: string;
  username: string;
}
