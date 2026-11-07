import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SILENT_ERRORS } from '../../../../core/http/error.interceptor';

const ME = '/api/user/me';

/** PATCH y DELETE /me valen para cualquier usuario conectado, también el SUPERVISOR. */
@Injectable({ providedIn: 'root' })
export class PerfilApi {
  private readonly http = inject(HttpClient);

  /** El formulario pinta sus errores en línea. */
  update(form: FormData) {
    return this.http.patch<unknown>(ME, form, {
      context: new HttpContext().set(SILENT_ERRORS, true),
    });
  }

  /** Borrado lógico: el backend cambia el username y no se puede volver a entrar. */
  remove() {
    return this.http.delete<void>(ME);
  }
}
