/** Un jugador del torneo, ya limpio: sin los valores de relleno del backend. */
export interface Jugador {
  id: string;
  nombre: string;
  /** null si es un contacto sin cuenta: el backend le pone un ULID que no significa nada. */
  username: string | null;
  /** null si no lo dieron: el backend guarda un GUID en su lugar. */
  email: string | null;
  bonos: number;
  imagen: string;
}

export interface ContactoFormValue {
  nombre: string;
  email: string;
  telefono: string;
}

/** Edición del ADMIN. El teléfono vacío no se envía: no sabemos el actual (ENCUERDATU-63). */
export interface JugadorEdicionValue {
  nombre: string;
  email: string;
  telefono: string;
}
