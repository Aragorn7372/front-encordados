import { HttpContext, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { SILENT_ERRORS } from '../../http/error.interceptor';
import { AuthStore } from './auth.store';

/** UserResponseDto de GET /api/user/me. */
export interface MeDto {
  username: string;
  imageUrl: string;
  name: string;
  bonos: number;
}

/**
 * Los datos del usuario conectado que el token no trae (foto, nombre). Se piden al entrar y
 * se olvidan al salir. Silencioso: al SUPERVISOR el backend le responde 403 (ENCUERDATU-73),
 * y eso no debe sacarle de la pantalla; sin foto se ven sus iniciales.
 */
@Injectable({ providedIn: 'root' })
export class MeStore {
  private readonly auth = inject(AuthStore);

  private readonly me = httpResource<MeDto>(() =>
    this.auth.isLoggedIn()
      ? { url: '/api/user/me', context: new HttpContext().set(SILENT_ERRORS, true) }
      : undefined,
  );

  /** null mientras carga o si el backend no lo da (SUPERVISOR, ENCUERDATU-73). */
  readonly datos = computed(() => (this.me.hasValue() ? this.me.value() : null));
  readonly loading = this.me.isLoading;

  readonly imagen = computed(() => this.datos()?.imageUrl ?? null);
  /** El nombre si lo hay; si no, el username del token. */
  readonly nombre = computed(() => this.datos()?.name || this.auth.username() || '');

  /** Tras cambiar la foto o el nombre en Perfil. */
  reload(): void {
    this.me.reload();
  }
}
