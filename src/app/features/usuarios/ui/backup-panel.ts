import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../../core/auth/store/auth.store';
import { guardarFichero, nombreDeFichero } from '../../../core/files/download';
import { AppError } from '../../../core/http/app-error';
import { ToastService } from '../../../core/toast/toast.service';
import { UsuariosApi } from '../data-access/api/usuarios.api';
import { ManifestDto } from '../data-access/dto/usuario.dto';
import { ENTIDAD_LABEL } from '../data-access/model/usuario.model';

/** Lo que hay que escribir para restaurar: borra la base de datos entera. */
export const PALABRA_RESTAURAR = 'RESTAURAR';

/**
 * Copia de seguridad (solo ADMIN). Restaurar va en tres pasos a propósito: elegir el zip,
 * ver lo que trae (manifest) y escribir la palabra. Antes de cargarlo, el backend borra todo.
 */
@Component({
  selector: 'app-backup-panel',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card bg-base-200 mt-6" aria-labelledby="backup-titulo">
      <div class="card-body">
        <h2 id="backup-titulo" class="card-title">Copia de seguridad</h2>
        <p class="text-sm opacity-70">
          Toda la base de datos en un zip: usuarios, torneos, materiales, cordajes y pedidos.
        </p>

        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" [disabled]="descargando()" (click)="descargar()">
            @if (descargando()) {
              <span class="loading loading-spinner loading-xs"></span>
            }
            Descargar copia
          </button>
          <label class="btn" [class.btn-disabled]="leyendo()">
            @if (leyendo()) {
              <span class="loading loading-spinner loading-xs"></span>
            }
            Restaurar una copia…
            <input
              type="file"
              class="hidden"
              accept=".zip"
              aria-label="Copia de seguridad a restaurar"
              (change)="elegir($event)"
            />
          </label>
        </div>

        @if (error(); as mensaje) {
          <div role="alert" class="alert alert-error alert-soft">{{ mensaje }}</div>
        }

        @if (manifest(); as datos) {
          <div class="bg-base-100 rounded-box mt-2 p-4" aria-label="Contenido de la copia">
            <p class="font-medium">{{ fichero()?.name }}</p>
            <p class="text-sm opacity-70">Hecha el {{ datos.exportedAt | date: 'medium' }}</p>
            <ul class="my-2 grid grid-cols-2 gap-1 text-sm sm:grid-cols-5">
              @for (entidad of datos.entities; track entidad.name) {
                <li>
                  <span class="opacity-60">{{ etiqueta(entidad.name) }}:</span>
                  {{ entidad.recordCount }}
                </li>
              }
            </ul>
            <!-- Un solo span: el alert es flex y partiría el texto alrededor del <strong> -->
            <div role="alert" class="alert alert-error alert-soft">
              <span>
                Restaurar <strong>borra toda la base de datos actual</strong> y la sustituye por
                esta copia. Lo que se haya hecho después de la copia se perderá.
              </span>
            </div>
            <label class="fieldset-legend mt-3" for="backup-confirmar">
              Escribe {{ palabra }} para confirmar
            </label>
            <input
              id="backup-confirmar"
              class="input w-full max-w-xs"
              autocomplete="off"
              [value]="confirmacion()"
              (input)="onConfirmacion($event)"
            />
            <div class="mt-3 flex gap-2">
              <button type="button" class="btn" (click)="cancelar()">Cancelar</button>
              <button
                type="button"
                class="btn btn-error"
                [disabled]="!confirmado() || restaurando()"
                (click)="restaurar()"
              >
                @if (restaurando()) {
                  <span class="loading loading-spinner loading-xs"></span>
                }
                Borrar todo y restaurar
              </button>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class BackupPanel {
  private readonly api = inject(UsuariosApi);
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);

  protected readonly palabra = PALABRA_RESTAURAR;
  protected readonly descargando = signal(false);
  protected readonly leyendo = signal(false);
  protected readonly restaurando = signal(false);
  protected readonly fichero = signal<File | null>(null);
  protected readonly manifest = signal<ManifestDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmacion = signal('');
  protected readonly confirmado = computed(
    () => this.confirmacion().trim().toUpperCase() === PALABRA_RESTAURAR,
  );

  protected onConfirmacion(event: Event): void {
    this.confirmacion.set((event.target as HTMLInputElement).value);
  }

  protected etiqueta(nombre: string): string {
    return ENTIDAD_LABEL[nombre] ?? nombre;
  }

  protected async descargar(): Promise<void> {
    this.descargando.set(true);
    try {
      const response = await firstValueFrom(this.api.exportarBackup());
      guardarFichero(response.body!, nombreDeFichero(response, 'copia-encordados.zip'));
    } catch {
      // El interceptor ya ha mostrado el error
    } finally {
      this.descargando.set(false);
    }
  }

  /** Paso 1 y 2: elegir el zip y enseñar lo que trae, sin tocar nada. */
  protected async elegir(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const fichero = input.files?.[0] ?? null;
    input.value = '';
    this.cancelar();
    if (!fichero) return;

    this.leyendo.set(true);
    try {
      this.manifest.set(await firstValueFrom(this.api.manifest(fichero)));
      this.fichero.set(fichero);
    } catch (error) {
      this.error.set(`No parece una copia válida: ${(error as AppError).message}`);
    } finally {
      this.leyendo.set(false);
    }
  }

  /** Paso 3. Los usuarios cambian: la sesión actual puede dejar de valer. */
  protected async restaurar(): Promise<void> {
    const fichero = this.fichero();
    if (!fichero || !this.confirmado()) return;
    this.restaurando.set(true);
    try {
      await firstValueFrom(this.api.restaurar(fichero));
      this.cancelar();
      this.toast.success('Copia restaurada. Vuelve a entrar.');
      this.auth.logout();
    } catch (error) {
      this.error.set(`No se ha podido restaurar: ${(error as AppError).message}`);
    } finally {
      this.restaurando.set(false);
    }
  }

  protected cancelar(): void {
    this.fichero.set(null);
    this.manifest.set(null);
    this.confirmacion.set('');
    this.error.set(null);
  }
}
