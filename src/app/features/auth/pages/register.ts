import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormField,
  FormRoot,
  email,
  form,
  maxLength,
  minLength,
  pattern,
  required,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { homeFor } from '../../../core/auth/guards/role-home';
import { toFormErrors } from '../../../core/http/form-errors';
import { FieldError } from '../../../shared/ui/field-error';
import { AuthCard } from '../ui/auth-card';
import { FormAlert } from '../ui/form-alert';

@Component({
  selector: 'app-register',
  imports: [FormField, FormRoot, RouterLink, FieldError, AuthCard, FormAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-card heading="Crear cuenta">
      <form [formRoot]="form">
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="username">Nombre de usuario</label>
          <input
            id="username"
            class="input w-full"
            autocomplete="username"
            [formField]="form.username"
          />
          <app-field-error [field]="form.username" />

          <label class="fieldset-legend" for="email">Email</label>
          <input
            id="email"
            class="input w-full"
            type="email"
            autocomplete="email"
            [formField]="form.email"
          />
          <app-field-error [field]="form.email" />

          <label class="fieldset-legend" for="password">Contraseña</label>
          <input
            id="password"
            class="input w-full"
            type="password"
            autocomplete="new-password"
            [formField]="form.password"
          />
          <app-field-error [field]="form.password" />
        </fieldset>

        <app-form-alert class="mt-2 block" [form]="form" />

        <button class="btn btn-primary mt-4 w-full" [disabled]="form().submitting()">
          Crear cuenta
        </button>
      </form>

      <a class="link mt-2 text-sm" routerLink="/login">Ya tengo cuenta</a>
    </app-auth-card>
  `,
})
export default class Register {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  private readonly model = signal({ username: '', email: '', password: '' });

  // Mismas reglas que RegisterDto: el backend sigue siendo quien valida de verdad
  protected readonly form = form(
    this.model,
    (path) => {
      required(path.username, { message: 'Elige un nombre de usuario' });
      minLength(path.username, 3, { message: 'Debe tener al menos 3 caracteres' });
      maxLength(path.username, 50, { message: 'No puede superar 50 caracteres' });
      pattern(path.username, /^[a-zA-Z0-9_]+$/, {
        message: 'Solo letras, números y guiones bajos',
      });

      required(path.email, { message: 'Escribe tu email' });
      email(path.email, { message: 'El email no es válido' });
      maxLength(path.email, 100, { message: 'No puede superar 100 caracteres' });

      required(path.password, { message: 'Elige una contraseña' });
      minLength(path.password, 6, { message: 'Debe tener al menos 6 caracteres' });
      maxLength(path.password, 100, { message: 'No puede superar 100 caracteres' });
    },
    {
      submission: {
        action: async (field) => {
          try {
            await this.auth.register(field().value());
            await this.router.navigateByUrl(homeFor(this.auth.role()!));
            return undefined;
          } catch (error) {
            return toFormErrors(error, field);
          }
        },
      },
    },
  );
}
