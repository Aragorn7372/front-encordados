import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ExcelActions } from './excel-actions';
import { ExcelApi } from './excel.api';
import { ExcelImportResult } from './excel.model';

const vacio: ExcelImportResult = {
  usersCreated: 0,
  usersUpdated: 0,
  materialsCreated: 0,
  materialsUpdated: 0,
  cuerdasCreated: 0,
  cuerdasUpdated: 0,
  tournamentsCreated: 0,
  tournamentsUpdated: 0,
  pedidosCreated: 0,
  pedidosUpdated: 0,
  pedidosLineasUpdated: 0,
  errors: [],
};

describe('ExcelActions', () => {
  const api = {
    exportar: vi.fn(() =>
      of(
        new HttpResponse({
          body: new Blob(['x']),
          headers: new HttpHeaders({
            'Content-Disposition': 'attachment; filename="jugadores.xlsx"',
          }),
        }),
      ),
    ),
    importar: vi.fn(() => of({ ...vacio, usersCreated: 3, errors: ['Fila 4: email no válido'] })),
  };
  let fixture: ComponentFixture<ExcelActions>;
  const element = () => fixture.nativeElement as HTMLElement;

  const render = async (tournamentId: string | null = 't1', conImportar = true) => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
    TestBed.configureTestingModule({ providers: [{ provide: ExcelApi, useValue: api }] });
    fixture = TestBed.createComponent(ExcelActions);
    fixture.componentRef.setInput('tournamentId', tournamentId);
    fixture.componentRef.setInput('tipos', ['users']);
    fixture.componentRef.setInput('conImportar', conImportar);
    await fixture.whenStable();
  };

  const elegirFichero = async () => {
    const input = element().querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', {
      value: [new File(['x'], 'jugadores.xlsx')],
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
  });

  it('exporta las hojas pedidas del torneo activo', async () => {
    await render();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    [...element().querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Exportar'))!
      .click();
    await fixture.whenStable();

    expect(api.exportar).toHaveBeenCalledWith('t1', ['users']);
    expect(click).toHaveBeenCalled();
  });

  it('sin torneo no deja exportar ni importar', async () => {
    await render(null);

    expect(element().querySelector<HTMLButtonElement>('button')!.disabled).toBe(true);
    expect(element().querySelector<HTMLInputElement>('input[type=file]')!.disabled).toBe(true);
  });

  it('al importar enseña lo que cambió y los errores, y avisa a la pantalla', async () => {
    await render();
    const importados: ExcelImportResult[] = [];
    fixture.componentInstance.importado.subscribe((r) => importados.push(r));

    await elegirFichero();

    const dialog = element().querySelector('dialog[open]')!;
    expect(dialog.textContent).toContain('3 jugadores creados');
    expect(dialog.textContent).toContain('Fila 4: email no válido');
    expect(importados).toHaveLength(1);
  });

  it('si el servidor rechaza la importación, se ve su mensaje', async () => {
    api.importar.mockReturnValueOnce(
      throwError(() => ({
        status: 403,
        message: 'No tienes permisos para importar a este torneo',
      })),
    );
    await render();

    await elegirFichero();

    expect(element().querySelector('dialog[open]')!.textContent).toContain('No tienes permisos');
  });

  it('se puede ocultar la importación', async () => {
    await render('t1', false);
    expect(element().querySelector('input[type=file]')).toBeNull();
  });
});
