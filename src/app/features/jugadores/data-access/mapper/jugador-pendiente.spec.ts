import { OP_CONTACTO_CREAR } from '../../../../shared/models/contacto-pendiente';
import { OP_JUGADOR } from '../model/jugador-operacion.model';
import { Jugador } from '../model/jugador.model';
import { aplicarPendientes, jugadorDeOperacion } from './jugador-pendiente';

const ana: Jugador = {
  id: 'u1',
  nombre: 'Ana',
  username: null,
  email: null,
  bonos: 10,
  imagen: '',
};
const contacto = (tempId: string, tournamentId = 't1') => ({
  tipo: OP_CONTACTO_CREAR,
  payload: { tempId, request: { name: 'Luis', email: null, phone: null, tournamentId } },
});

describe('aplicarPendientes (jugadores)', () => {
  it('un contacto creado sin conexión aparece en su torneo, no en otro', () => {
    const lista = aplicarPendientes([ana], [contacto('tmp-1'), contacto('tmp-2', 't9')], {}, 't1');

    expect(lista.map((j) => [j.id, j.nombre])).toEqual([
      ['u1', 'Ana'],
      ['tmp-1', 'Luis'],
    ]);
  });

  it('los bonos sin enviar ya se suman', () => {
    const [jugador] = aplicarPendientes(
      [ana],
      [{ tipo: OP_JUGADOR.bonos, payload: { id: 'u1', cantidad: 5 } }],
      {},
      't1',
    );
    expect(jugador.bonos).toBe(15);
  });

  it('editar cambia nombre y email; lo vacío deja lo que había', () => {
    const [jugador] = aplicarPendientes(
      [{ ...ana, email: 'ana@example.com' }],
      [
        {
          tipo: OP_JUGADOR.editar,
          payload: { id: 'u1', value: { nombre: 'Ana P.', email: '', telefono: '' } },
        },
      ],
      {},
      't1',
    );
    expect([jugador.nombre, jugador.email]).toEqual(['Ana P.', 'ana@example.com']);
  });

  it('borrado sin enviar ya no se ve', () => {
    expect(
      aplicarPendientes([ana], [{ tipo: OP_JUGADOR.borrar, payload: { id: 'u1' } }], {}, 't1'),
    ).toEqual([]);
  });

  it('sabe a qué jugador afecta cada cambio, para marcarlo «sin enviar»', () => {
    expect(jugadorDeOperacion(contacto('tmp-1'))).toBe('tmp-1');
    expect(jugadorDeOperacion({ tipo: OP_JUGADOR.bonos, payload: { id: 'u1', cantidad: 1 } })).toBe(
      'u1',
    );
    expect(jugadorDeOperacion({ tipo: 'pedido.crear', payload: {} })).toBeNull();
  });
});
