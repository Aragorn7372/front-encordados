import { provideOutboxDirecto } from '../../../core/offline/outbox.testing';
import { jugadoresManejadores } from '../../../features/jugadores/jugadores.outbox';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { JugadoresApi } from '../data-access/api/jugadores.api';
import { ContactoForm } from './contacto-form';

describe('ContactoForm', () => {
  const api = { createContact: vi.fn(() => of({})) };
  let fixture: ComponentFixture<ContactoForm>;
  let creados: number;

  const element = () => fixture.nativeElement as HTMLElement;
  const escribir = async (selector: string, valor: string) => {
    const input = element().querySelector<HTMLInputElement>(selector)!;
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
    TestBed.configureTestingModule({
      providers: [
        { provide: JugadoresApi, useValue: api },
        provideOutboxDirecto(jugadoresManejadores),
      ],
    });
    fixture = TestBed.createComponent(ContactoForm);
    fixture.componentRef.setInput('tournamentId', 't1');
    creados = 0;
    fixture.componentInstance.created.subscribe(() => creados++);
    await fixture.whenStable();
  });

  it('basta con el nombre: email y teléfono son opcionales', async () => {
    await escribir('#contacto-nombre', 'Ana Pérez');

    await enviar();

    expect(api.createContact).toHaveBeenCalledWith({
      name: 'Ana Pérez',
      email: null,
      phone: null,
      tournamentId: 't1',
    });
    expect(creados).toBe(1);
  });

  it('el nombre es obligatorio', async () => {
    await enviar();

    expect(api.createContact).not.toHaveBeenCalled();
    expect(element().textContent).toContain('Indica el nombre');
  });

  it('un email mal escrito no se envía', async () => {
    await escribir('#contacto-nombre', 'Ana Pérez');
    await escribir('#contacto-email', 'ana@');

    await enviar();

    expect(api.createContact).not.toHaveBeenCalled();
    expect(element().textContent).toContain('No parece un email válido');
  });

  it('con email avisa de que le llegará un correo', async () => {
    expect(element().textContent).not.toContain('Le llegará un email');
    await escribir('#contacto-email', 'ana@tenis.com');
    expect(element().textContent).toContain('Le llegará un email');
  });
});
