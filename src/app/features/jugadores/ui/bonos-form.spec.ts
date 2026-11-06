import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { JugadoresApi } from '../data-access/api/jugadores.api';
import { Jugador } from '../data-access/model/jugador.model';
import { BonosForm } from './bonos-form';

const ana: Jugador = {
  id: 'u2',
  nombre: 'Ana',
  username: null,
  email: null,
  bonos: 10,
  imagen: '',
};

describe('BonosForm', () => {
  const api = { addBonos: vi.fn(() => of({})) };
  let fixture: ComponentFixture<BonosForm>;
  let guardados: number[];

  const element = () => fixture.nativeElement as HTMLElement;
  const cantidad = async (valor: string) => {
    const input = element().querySelector<HTMLInputElement>('#bonos-cantidad')!;
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

  beforeEach(async () => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: JugadoresApi, useValue: api }] });
    fixture = TestBed.createComponent(BonosForm);
    fixture.componentRef.setInput('jugador', ana);
    guardados = [];
    fixture.componentInstance.saved.subscribe((total) => guardados.push(total));
    await fixture.whenStable();
  });

  it('suma la cantidad y dice cómo quedará', async () => {
    await cantidad('15');
    expect(element().textContent).toMatch(/Quedará en .*25[.,]00/);

    await enviar();

    expect(api.addBonos).toHaveBeenCalledWith('u2', 15);
    expect(guardados).toEqual([25]);
  });

  it('no deja restar: el backend solo suma', async () => {
    await cantidad('-5');

    await enviar();

    expect(api.addBonos).not.toHaveBeenCalled();
    expect(element().textContent).toContain('Tiene que ser más de 0');
  });

  it('muestra el error del servidor', async () => {
    api.addBonos.mockReturnValueOnce(
      throwError(() => ({ status: 403, message: 'No tienes permisos', fieldErrors: {} })),
    );
    await cantidad('5');

    await enviar();

    expect(element().querySelector('[role=alert]')?.textContent).toContain('No tienes permisos');
    expect(guardados).toHaveLength(0);
  });
});
