import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { esEmail } from '../../../shared/utils/validacion';
import { AuthApi } from '../../../core/auth/api/auth.api';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { MeStore } from '../../../core/auth/store/me.store';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { AppError } from '../../../core/http/app-error';
import { ToastService } from '../../../core/toast/toast.service';
import { ROLE_LABEL } from '../../../shared/models/roles';
import { Avatar } from '../../../shared/ui/avatar';
import { PageHeader } from '../../../shared/ui/page-header';
import { PerfilApi } from '../data-access/api/perfil.api';
import { PerfilActual } from '../data-access/model/perfil.model';
import { PerfilForm } from '../ui/perfil-form';

/** Los datos propios, la contraseña y borrar la cuenta. Para todos los roles. */
@Component({
  selector: 'app-perfil-page',
  imports: [Avatar, CurrencyPipe, PageHeader, PerfilForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header heading="Mi perfil" />

    <section class="card bg-base-100 border-base-300 mb-4 border">
      <div class="card-body flex-row flex-wrap items-center gap-4">
        <app-avatar [url]="me.imagen()" [nombre]="me.nombre()" size="md" />
        <div class="min-w-0 flex-1">
          <p class="text-lg font-semibold">{{ me.nombre() }}</p>
          <p class="text-sm opacity-70">{{ auth.username() }} · {{ rol() }}</p>
        </div>
        @if (me.datos(); as datos) {
          <div class="text-right">
            <p class="text-sm opacity-70">Bonos</p>
            <p class="text-xl font-semibold tabular-nums">{{ datos.bonos | currency: 'EUR' }}</p>
          </div>
        }
      </div>
    </section>

    <section class="card bg-base-100 border-base-300 mb-4 border" aria-labelledby="perfil-datos">
      <div class="card-body">
        <h2 id="perfil-datos" class="card-title text-base">Tus datos</h2>
        <!-- Se monta cuando se sabe lo que hay: así el formulario nace con los datos -->
        @if (!me.loading()) {
          <app-perfil-form
            [actual]="actual()"
            [imagen]="me.imagen()"
            (saved)="onGuardado($event)"
          />
        } @else {
          <span class="loading loading-spinner" aria-label="Cargando"></span>
        }
      </div>
    </section>

    <section class="card bg-base-100 border-base-300 mb-4 border" aria-labelledby="perfil-clave">
      <div class="card-body">
        <h2 id="perfil-clave" class="card-title text-base">Contraseña</h2>
        <p class="text-sm opacity-70">
          Te enviamos un enlace al email de tu cuenta para que elijas una nueva.
        </p>
        <form class="flex flex-wrap items-start gap-2" (submit)="pedirEnlace($event)">
          <input
            class="input w-full max-w-xs"
            type="email"
            aria-label="Email de tu cuenta"
            placeholder="Email de tu cuenta"
            [value]="emailClave()"
            (input)="onEmailClave($event)"
          />
          <button class="btn" [disabled]="!emailValido() || enviando()">Enviar enlace</button>
        </form>
        @if (enlace(); as mensaje) {
          <p class="text-sm" role="status">{{ mensaje }}</p>
        }
      </div>
    </section>

    <section class="card border-error/40 border" aria-labelledby="perfil-borrar">
      <div class="card-body">
        <h2 id="perfil-borrar" class="card-title text-error text-base">Borrar mi cuenta</h2>
        <p class="text-sm opacity-70">No podrás volver a entrar con esta cuenta.</p>
        <div>
          <button type="button" class="btn btn-error btn-outline" (click)="borrar()">
            Borrar mi cuenta
          </button>
        </div>
      </div>
    </section>
  `,
})
export default class PerfilPage {
  protected readonly auth = inject(AuthStore);
  protected readonly me = inject(MeStore);
  private readonly api = inject(PerfilApi);
  private readonly authApi = inject(AuthApi);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly rol = computed(() => {
    const rol = this.auth.role();
    return rol ? ROLE_LABEL[rol] : '';
  });
  protected readonly actual = computed<PerfilActual>(() => ({
    nombre: this.me.datos()?.name ?? '',
    username: this.me.datos()?.username ?? this.auth.username() ?? '',
  }));

  protected readonly emailClave = signal('');
  protected readonly emailValido = computed(() => esEmail(this.emailClave()));
  protected readonly enviando = signal(false);
  protected readonly enlace = signal<string | null>(null);

  protected onGuardado(usernameCambiado: boolean): void {
    if (usernameCambiado) {
      // El token sigue con el username viejo: hay que entrar con el nuevo
      this.toast.success('Datos guardados. Vuelve a entrar con tu nuevo usuario.');
      this.auth.logout();
      return;
    }
    this.toast.success('Datos guardados');
    this.me.reload();
  }

  protected onEmailClave(event: Event): void {
    this.emailClave.set((event.target as HTMLInputElement).value);
    this.enlace.set(null);
  }

  protected async pedirEnlace(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.emailValido()) return;
    this.enviando.set(true);
    try {
      await firstValueFrom(this.authApi.requestPasswordChange(this.emailClave().trim()));
      // Mismo mensaje exista o no el email: no se revela qué emails hay registrados
      this.enlace.set('Si ese email es el de tu cuenta, te llegará el enlace en unos minutos.');
    } catch (error) {
      this.enlace.set((error as AppError).message);
    } finally {
      this.enviando.set(false);
    }
  }

  protected async borrar(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Borrar mi cuenta',
      message: 'No podrás volver a entrar con esta cuenta. ¿Seguro?',
      confirmText: 'Borrar mi cuenta',
      cancelText: 'Volver',
      danger: true,
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.remove());
      this.toast.success('Cuenta borrada');
      this.auth.logout();
    } catch {
      // El interceptor ya ha mostrado el error
    }
  }
}
