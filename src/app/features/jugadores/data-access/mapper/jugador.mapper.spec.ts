import { JugadorDto } from '../dto/jugador.dto';
import { coincideJugador, textoContactos, toContactoRequest, toJugador } from './jugador.mapper';

const dto = (overrides: Partial<JugadorDto> = {}): JugadorDto => ({
  userId: 'u1',
  username: 'jugador_juan',
  imageUrl: 'img.png',
  name: 'Juan Martínez',
  email: 'juan@tenis.com',
  role: 'USER',
  tournamentId: 't1',
  bonos: 10,
  ...overrides,
});

describe('toJugador', () => {
  it('traduce un jugador con cuenta', () => {
    expect(toJugador(dto())).toEqual({
      id: 'u1',
      nombre: 'Juan Martínez',
      username: 'jugador_juan',
      email: 'juan@tenis.com',
      bonos: 10,
      imagen: 'img.png',
    });
  });

  it('un contacto sin email ni cuenta no enseña el relleno del backend', () => {
    const contacto = toJugador(
      dto({
        username: '01KS0Q28TEJ0SYA6JJ5H4W4CMP',
        email: '3f2b8c1e-9d4a-4f7e-8b6a-1c2d3e4f5a6b',
      }),
    );

    expect(contacto.username).toBeNull();
    expect(contacto.email).toBeNull();
  });
});

describe('coincideJugador', () => {
  const juan = toJugador(dto());

  it.each(['juan', 'MARTINEZ', 'mart', 'tenis.com', 'jugador_'])('encuentra "%s"', (termino) => {
    expect(coincideJugador(juan, termino)).toBe(true);
  });

  it('no encuentra lo que no está', () => {
    expect(coincideJugador(juan, 'ana')).toBe(false);
  });
});

describe('toContactoRequest', () => {
  it('lo vacío viaja como null y se recorta lo demás', () => {
    expect(toContactoRequest({ nombre: ' Ana Pérez ', email: ' ', telefono: '' }, 't1')).toEqual({
      name: 'Ana Pérez',
      email: null,
      phone: null,
      tournamentId: 't1',
    });
  });
});

describe('textoContactos', () => {
  it('una línea por jugador, con el email si lo tiene', () => {
    const lista = [toJugador(dto()), toJugador(dto({ name: 'Ana', email: 'guid-sin-arroba' }))];
    expect(textoContactos(lista)).toBe('Juan Martínez <juan@tenis.com>\nAna');
  });
});
