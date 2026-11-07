import { provideOutboxDirecto } from '../../../core/offline/outbox.testing';
import { cordajesManejadores } from '../../../features/cordajes/cordajes.outbox';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { ExcelApi } from '../../../core/excel/excel.api';
import { TournamentContext } from '../../../core/tournament-context/tournament-context';
import { CordajesApi } from '../data-access/api/cordajes.api';
import { Cordaje } from '../data-access/model/cordaje.model';
import CordajesPage from './cordajes-page';

const cordaje = (id: number, modelo: string, stock: number, extra: Partial<Cordaje> = {}) =>
  ({
    id,
    marca: 'Babolat',
    modelo,
    stock,
    precio: 19.99,
    formato: 'Reel',
    tipo: 'Polyester',
    calibre: 1.25,
    imagen: '',
    ...extra,
  }) as Cordaje;

describe('CordajesPage', () => {
  const torneo = signal<string | null>('t1');
  const api = {
    list: vi.fn(() =>
      of({
        cordajes: [
          cordaje(1, 'RPM Blast', 50),
          cordaje(2, 'Touch VS', 2, { tipo: 'NaturalGut', formato: 'Set' }),
        ],
        total: 2,
      }),
    ),
    update: vi.fn((id: number, value: { stock: number }) =>
      of(cordaje(id, 'RPM Blast', value.stock)),
    ),
    remove: vi.fn(() => of(undefined)),
  };
  const confirm = { ask: vi.fn(async () => true) };
  let fixture: ComponentFixture<CordajesPage>;

  const element = () => fixture.nativeElement as HTMLElement;
  const filas = () => [...element().querySelectorAll('tbody tr')].map((tr) => tr.textContent ?? '');

  const render = async () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: CordajesApi, useValue: api },
        provideOutboxDirecto(cordajesManejadores),
        { provide: ExcelApi, useValue: {} },
        { provide: TournamentContext, useValue: { selectedId: torneo } },
        { provide: ConfirmService, useValue: confirm },
      ],
    });
    fixture = TestBed.createComponent(CordajesPage);
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    torneo.set('t1');
  });

  it('lista los cordajes del torneo con sus datos en español', async () => {
    await render();

    expect(filas()).toHaveLength(2);
    expect(filas()[1]).toContain('Tripa natural');
    expect(filas()[1]).toContain('Set individual');
  });

  it('avisa del stock bajo y deja ver solo esos', async () => {
    await render();

    const aviso = element().querySelector('[role=status]')!;
    expect(aviso.textContent).toContain('1 cordaje tiene 5 o menos');

    [...aviso.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Ver cuáles'))!
      .click();
    await fixture.whenStable();

    expect(filas()).toHaveLength(1);
    expect(filas()[0]).toContain('Touch VS');
  });

  it('filtra por tipo', async () => {
    await render();
    const select = element().querySelector<HTMLSelectElement>('[aria-label="Filtrar por tipo"]')!;
    select.value = 'Polyester';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(filas()).toHaveLength(1);
    expect(filas()[0]).toContain('RPM Blast');
  });

  it('+ en la fila sube el stock sin recargar la lista', async () => {
    await render();

    element().querySelector<HTMLButtonElement>('[aria-label="Añadir uno a RPM Blast"]')!.click();
    await fixture.whenStable();

    expect(api.update).toHaveBeenCalledWith(1, expect.objectContaining({ stock: 51 }));
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(filas()[0]).toContain('51');
  });

  it('sin torneo pide elegirlo', async () => {
    torneo.set(null);
    await render();

    expect(element().textContent).toContain('Selecciona un torneo');
    expect(api.list).not.toHaveBeenCalled();
  });

  it('borrar pide confirmación y recarga', async () => {
    await render();

    element().querySelector<HTMLButtonElement>('[aria-label="Borrar RPM Blast"]')!.click();
    await fixture.whenStable();

    expect(confirm.ask).toHaveBeenCalled();
    expect(api.remove).toHaveBeenCalledWith(1);
    expect(api.list).toHaveBeenCalledTimes(2);
  });
});
