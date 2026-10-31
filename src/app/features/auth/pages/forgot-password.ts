import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../../../core/auth/api/auth.api';
import { toFormErrors } from '../../../core/http/form-errors';
import { FieldError } from '../../../shared/ui/field-error';
import { AuthCard } from '../ui/auth-card';
import { FormAlert } from '../ui/form-alert';

@Component({
  selector: 'app-forgot-password',
  imports: [FormField, FormRoot, RouterLink, FieldError, AuthCard, FormAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-card heading="Recuperar contraseña">
      @if (sent()) {
        <div role="status" class="alert alert-success alert-soft">
          Te hemos enviado un email con un enlace para cambiar la contraseña.
        </div>
      } @else {
        <form [formRoot]="form">
          <fieldset class="fieldset">
            <label class="fieldset-legend" for="email">Email de tu cuenta</label>
            <input
              id="email"
              class="input w-full"
              type="email"
              autocomplete="email"
              [formField]="form.email"
            />
            <app-field-error [field]="form.email" />
          </fieldset>

          <app-form-alert class="mt-2 block" [form]="form" />

          <button class="btn btn-primary mt-4 w-full" [disabled]="form().submitting()">
            Enviar enlace
          </button>
        </form>
      }

      <a class="link mt-2 text-sm" routerLink="/login">Volver a iniciar sesión</a>
    </app-auth-card>
  `,
})
export default class ForgotPassword {
  private readonly api = inject(AuthApi);

  protected readonly sent = signal(false);
  private readonly model = signal({ email: '' });

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.email, { message: 'Escribe tu email' });
      email(path.email, { message: 'El email no es válido' });
    },
    {
      submission: {
        action: async (field) => {
          try {
            await firstValueFrom(this.api.requestPasswordChange(field().value().email));
            this.sent.set(true);
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );
}
