import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toFormErrors } from '../../../core/http/form-errors';
import { ROLE_LABEL, Role } from '../../../shared/models/roles';
import { UsuariosApi } from '../data-access/api/usuarios.api';
import { ROLES_ASIGNABLES, Usuario } from '../data-access/model/usuario.model';

/** Dar rol a una cuenta sin rol (solo ADMIN). Solo roles válidos: el backend no lo comprueba. */
@Component({
  selector: 'app-rol-form',
  imports: [FormField, FormRoot],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formRoot]="form">
      <p class="mb-3 text-sm">
        <strong>{{ usuario().nombre }}</strong>
        @if (usuario().email; as email) {
          ({{ email }})
        }
      </p>
      <fieldset class="fieldset">
        <label class="fieldset-legend" for="rol-nuevo">Rol</label>
        <select id="rol-nuevo" class="select w-full" [formField]="form.rol">
          @for (rol of roles; track rol) {
            <option [value]="rol">{{ label[rol] }}</option>
          }
        </select>
      </fieldset>
      <div role="alert" class="alert alert-warning alert-soft mt-3">
        Ahora mismo no se puede deshacer: después no se le podrá cambiar ni quitar el rol.
      </div>

      @for (error of form().errors(); track error.kind) {
        <div role="alert" class="alert alert-error alert-soft mt-2">{{ error.message }}</div>
      }

      <div class="modal-action">
        <button type="button" class="btn" (click)="cancelled.emit()">Cancelar</button>
        <button class="btn btn-primary" [disabled]="form().submitting()">
          Dar rol de {{ label[model().rol] }}
        </button>
      </div>
    </form>
  `,
})
export class RolForm {
  private readonly api = inject(UsuariosApi);

  readonly usuario = input.required<Usuario>();
  readonly saved = output<Role>();
  readonly cancelled = output();

  protected readonly roles = ROLES_ASIGNABLES;
  protected readonly label = ROLE_LABEL;
  protected readonly model = signal<{ rol: Role }>({ rol: 'ENCORDER' });

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.rol, { message: 'Elige un rol' });
    },
    {
      submission: {
        action: async (field) => {
          const { rol } = field().value();
          try {
            await firstValueFrom(this.api.darRol(this.usuario().id, rol));
            this.saved.emit(rol);
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );
}
