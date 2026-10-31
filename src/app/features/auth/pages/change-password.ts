import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import {
  FormField,
  FormRoot,
  form,
  maxLength,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../../../core/auth/api/auth.api';
import { toFormErrors } from '../../../core/http/form-errors';
import { ToastService } from '../../../core/toast/toast.service';
import { FieldError } from '../../../shared/ui/field-error';
import { AuthCard } from '../ui/auth-card';
import { FormAlert } from '../ui/form-alert';

@Component({
  selector: 'app-change-password',
  imports: [FormField, FormRoot, RouterLink, FieldError, AuthCard, FormAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-card heading="Cambiar contraseña">
      @if (token()) {
        <form [formRoot]="form">
          <fieldset class="fieldset">
            <label class="fieldset-legend" for="newPassword">Nueva contraseña</label>
            <input
              id="newPassword"
              class="input w-full"
              type="password"
              autocomplete="new-password"
              [formField]="form.newPassword"
            />
            <app-field-error [field]="form.newPassword" />

            <label class="fieldset-legend" for="confirmPassword">Repite la contraseña</label>
            <input
              id="confirmPassword"
              class="input w-full"
              type="password"
              autocomplete="new-password"
              [formField]="form.confirmPassword"
            />
            <app-field-error [field]="form.confirmPassword" />
          </fieldset>

          <app-form-alert class="mt-2 block" [form]="form" />

          <button class="btn btn-primary mt-4 w-full" [disabled]="form().submitting()">
            Guardar contraseña
          </button>
        </form>
      } @else {
        <div role="alert" class="alert alert-error alert-soft">
          El enlace no es válido. Solicita uno nuevo.
        </div>
        <a class="link mt-2 text-sm" routerLink="/recuperar">Solicitar otro enlace</a>
      }
    </app-auth-card>
  `,
})
export default class ChangePassword {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Query string del email: `?guid=password_<guid>`. La API solo quiere el guid. */
  readonly guid = input<string>();
  protected readonly token = computed(() => this.guid()?.replace(/^password_/, '') ?? '');

  private readonly model = signal({ newPassword: '', confirmPassword: '' });

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.newPassword, { message: 'Escribe la nueva contraseña' });
      minLength(path.newPassword, 6, { message: 'Debe tener al menos 6 caracteres' });
      maxLength(path.newPassword, 100, { message: 'No puede superar 100 caracteres' });

      required(path.confirmPassword, { message: 'Repite la contraseña' });
      validate(path.confirmPassword, ({ value, valueOf }) =>
        value() === valueOf(path.newPassword)
          ? undefined
          : { kind: 'mismatch', message: 'Las contraseñas no coinciden' },
      );
    },
    {
      submission: {
        action: async (field) => {
          try {
            await firstValueFrom(this.api.changePassword(this.token(), field().value()));
            this.toast.success('Contraseña cambiada. Ya puedes iniciar sesión.');
            await this.router.navigate(['/login']);
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );
}
