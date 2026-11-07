import { provideOutboxDirecto } from '../../../core/offline/outbox.testing';
import { cordajesManejadores } from '../../../features/cordajes/cordajes.outbox';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CordajesApi } from '../data-access/api/cordajes.api';
import { Cordaje } from '../data-access/model/cordaje.model';
import { CordajeForm } from './cordaje-form';

const rpm: Cordaje = {
  id: 1,
  marca: 'Babolat',
  modelo: 'RPM Blast',
  stock: 50,
  precio: 19.99,
  formato: 'Reel',
  tipo: 'Polyester',
  calibre: 1.25,
  imagen: 'img.png',
};

describe('CordajeForm', () => {
  const api = {
    create: vi.fn(() => of(rpm)),
    update: vi.fn(() => of(rpm)),
  };
  let fixture: ComponentFixture<CordajeForm>;
  const element = () => fixture.nativeElement as HTMLElement;

  const render = async (cordaje: Cordaje | null) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CordajesApi, useValue: api },
        provideOutboxDirecto(cordajesManejadores),
      ],
    });
    fixture = TestBed.createComponent(CordajeForm);
    fixture.componentRef.setInput('tournamentId', 't1');
    fixture.componentRef.setInput('cordaje', cordaje);
    await fixture.whenStable();
  };
  const escribir = async (id: string, valor: string) => {
    const input = element().querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const enviar = async () => {
    element()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(() => vi.clearAllMocks());

  it('crea en el torneo activo', async () => {
    await render(null);
    await escribir('cordaje-marca', 'Luxilon');
    await escribir('cordaje-modelo', 'ALU Power');
    await escribir('cordaje-precio', '22');

    await enviar();

    expect(api.create).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ marca: 'Luxilon', modelo: 'ALU Power', precio: 22, imagen: null }),
    );
  });

  it('al editar precarga y guarda con errores en línea', async () => {
    await render(rpm);
    expect(element().querySelector<HTMLInputElement>('#cordaje-modelo')!.value).toBe('RPM Blast');

    await enviar();

    expect(api.update).toHaveBeenCalledWith(1, expect.objectContaining({ stock: 50 }));
  });

  it('valida como el backend', async () => {
    await render(null);
    await escribir('cordaje-precio', '0');

    await enviar();

    expect(api.create).not.toHaveBeenCalled();
    expect(element().textContent).toContain('Indica la marca');
    expect(element().textContent).toContain('Al menos 0,10 €');
  });

  it('muestra el error del servidor', async () => {
    api.update.mockReturnValueOnce(
      throwError(() => ({ status: 400, message: 'StringFormat inválido', fieldErrors: {} })),
    );
    await render(rpm);

    await enviar();

    expect(element().querySelector('[role=alert]')?.textContent).toContain('StringFormat inválido');
  });
});
