import { RequiereConexion } from '../../shared/ui/requiere-conexion';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Modal } from '../../shared/ui/modal';
import { guardarFichero, nombreDeFichero } from '../files/download';
import { AppError } from '../http/app-error';
import { ExcelApi } from './excel.api';
import { ExcelImportResult, ExcelTipo, resumenImportacion } from './excel.model';

/** Resultado que se enseña tras importar: lo que cambió y los errores fila a fila. */
interface Informe {
  cambios: string[];
  errores: string[];
}

/**
 * Exportar e importar el Excel del torneo activo, igual en todas las pantallas.
 * La pantalla decide qué hojas (`tipos`) y si se puede importar.
 */
@Component({
  selector: 'app-excel-actions',
  imports: [RequiereConexion, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="join">
      <button
        type="button"
        class="btn join-item"
        [disabled]="!tournamentId() || exportando()"
        appRequiereConexion="El Excel necesita conexión"
        (click)="exportar()"
      >
        @if (exportando()) {
          <span class="loading loading-spinner loading-xs"></span>
        }
        Exportar Excel
      </button>
      @if (conImportar() && !simple()) {
        <label
          appRequiereConexion="El Excel necesita conexión"
          class="btn join-item"
          [class.btn-disabled]="!tournamentId() || importando()"
          [attr.aria-disabled]="!tournamentId() || importando()"
        >
          @if (importando()) {
            <span class="loading loading-spinner loading-xs"></span>
          }
          Importar Excel
          <input
            type="file"
            class="hidden"
            accept=".xlsx"
            aria-label="Fichero Excel a importar"
            [disabled]="!tournamentId() || importando()"
            (change)="importar($event)"
          />
        </label>
      }
    </div>

    <app-modal
      heading="Resultado de la importación"
      [open]="!!informe()"
      (closed)="informe.set(null)"
    >
      @if (informe(); as datos) {
        @if (datos.cambios.length) {
          <ul class="list-inside list-disc">
            @for (cambio of datos.cambios; track cambio) {
              <li>{{ cambio }}</li>
            }
          </ul>
        } @else if (!datos.errores.length) {
          <p>El fichero no traía cambios.</p>
        }
        @if (datos.errores.length) {
          <div role="alert" class="alert alert-error alert-soft mt-3">
            <ul>
              @for (error of datos.errores; track $index) {
                <li>{{ error }}</li>
              }
            </ul>
          </div>
        }
      }
    </app-modal>
  `,
})
export class ExcelActions {
  private readonly api = inject(ExcelApi);

  readonly tournamentId = input.required<string | null>();
  readonly tipos = input.required<ExcelTipo[]>();
  /** Si el servidor no propone nombre. */
  readonly nombre = input('datos.xlsx');
  readonly conImportar = input(true);
  /** La exportación del SUPERVISOR (/api/excel/export): sin `tipos` ni importación. */
  readonly simple = input(false);
  /** Para que la pantalla recargue lo que haya cambiado. */
  readonly importado = output<ExcelImportResult>();

  protected readonly exportando = signal(false);
  protected readonly importando = signal(false);
  protected readonly informe = signal<Informe | null>(null);

  protected async exportar(): Promise<void> {
    const torneo = this.tournamentId();
    if (!torneo) return;
    this.exportando.set(true);
    try {
      const response = await firstValueFrom(
        this.simple() ? this.api.exportarSimple(torneo) : this.api.exportar(torneo, this.tipos()),
      );
      guardarFichero(response.body!, nombreDeFichero(response, this.nombre()));
    } catch {
      // El interceptor ya ha mostrado el error
    } finally {
      this.exportando.set(false);
    }
  }

  protected async importar(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const fichero = input.files?.[0];
    const torneo = this.tournamentId();
    // Vaciar ya: así elegir otra vez el mismo fichero vuelve a disparar el cambio
    input.value = '';
    if (!fichero || !torneo) return;

    this.importando.set(true);
    try {
      const result = await firstValueFrom(this.api.importar(torneo, this.tipos(), fichero));
      this.informe.set({ cambios: resumenImportacion(result), errores: result.errors ?? [] });
      this.importado.emit(result);
    } catch (error) {
      this.informe.set({ cambios: [], errores: [(error as AppError).message] });
    } finally {
      this.importando.set(false);
    }
  }
}
