import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { homeFor } from '../../../core/auth/guards/role-home';
import { toFormErrors } from '../../../core/http/form-errors';
import { FieldError } from '../../../shared/ui/field-error';
import { AuthCard } from '../ui/auth-card';
import { FormAlert } from '../ui/form-alert';

@Component({
  selector: 'app-login',
  imports: [FormField, FormRoot, RouterLink, FieldError, AuthCard, FormAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-card heading="Iniciar sesión">
      <form [formRoot]="form">
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="username">Usuario o email</label>
          <input
            id="username"
            class="input w-full"
            autocomplete="username"
            [formField]="form.username"
          />
          <app-field-error [field]="form.username" />

          <label class="fieldset-legend" for="password">Contraseña</label>
          <input
            id="password"
            class="input w-full"
            type="password"
            autocomplete="current-password"
            [formField]="form.password"
          />
          <app-field-error [field]="form.password" />
        </fieldset>

        <app-form-alert class="mt-2 block" [form]="form" />

        <button class="btn btn-primary mt-4 w-full" [disabled]="form().submitting()">Entrar</button>
      </form>

      <div class="mt-2 flex justify-between text-sm">
        <a class="link" routerLink="/recuperar">¿Has olvidado la contraseña?</a>
        <a class="link" routerLink="/registro">Crear cuenta</a>
      </div>
    </app-auth-card>
  `,
})
export default class Login {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  /** Viene de la query string, la rellena el authGuard. */
  readonly returnUrl = input<string>();

  private readonly model = signal({ username: '', password: '' });

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.username, { message: 'Escribe tu usuario o email' });
      required(path.password, { message: 'Escribe tu contraseña' });
    },
    {
      submission: {
        action: async (field) => {
          try {
            await this.auth.login(field().value());
            await this.router.navigateByUrl(this.returnUrl() ?? homeFor(this.auth.role()!));
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );
}
