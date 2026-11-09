import { UsuarioDto } from '../dto/usuario.dto';
import { coincideUsuario, grupoDe, gruposVisibles, toUsuario } from './usuario.mapper';

const dto = (overrides: Partial<UsuarioDto> = {}): UsuarioDto => ({
  userId: 'u1',
  username: 'carlos_encordador',
  imageUrl: '',
  name: 'Carlos García',
  email: 'carlos@encordados.com',
  role: 'ENCORDER',
  tournamentId: null,
  bonos: 0,
  ...overrides,
});

describe('usuario.mapper', () => {
  it.each<[Partial<UsuarioDto>, string]>([
    [{ role: 'ENCORDER' }, 'encordadores'],
    [{ role: 'SUPERVISOR' }, 'supervisores'],
    [{ role: 'OWNER' }, 'propietarios'],
    [{ role: 'ADMIN' }, 'propietarios'],
    [{ role: 'USER', tournamentId: null }, 'sin-rol'],
    [{ role: 'USER', tournamentId: 't1' }, 'jugadores'],
  ])('%o → %s', (overrides, grupo) => {
    expect(grupoDe(toUsuario(dto(overrides)))).toBe(grupo);
  });

  it('un rol desconocido no rompe nada', () => {
    expect(toUsuario(dto({ role: 'encorder-raro' })).rol).toBeNull();
  });

  it('el rol llega en mayúsculas aunque el backend lo guarde en minúsculas', () => {
    expect(toUsuario(dto({ role: 'supervisor' })).rol).toBe('SUPERVISOR');
  });

  it('un contacto no enseña el relleno del backend', () => {
    const contacto = toUsuario(
      dto({ username: '01M6RK1GHTB9CT1QWF7TZ37C5J', email: 'b1c2-sin-arroba', role: 'USER' }),
    );
    expect([contacto.username, contacto.email]).toEqual([null, null]);
  });

  it('el OWNER ve encordadores, supervisores, jugadores y sin rol; el ADMIN, también propietarios', () => {
    expect(gruposVisibles('OWNER')).toEqual([
      'encordadores',
      'supervisores',
      'jugadores',
      'sin-rol',
    ]);
    expect(gruposVisibles('ADMIN')).toEqual([
      'encordadores',
      'supervisores',
      'jugadores',
      'sin-rol',
      'propietarios',
    ]);
  });

  it('busca por nombre, usuario o email', () => {
    const carlos = toUsuario(dto());
    expect(coincideUsuario(carlos, 'GARCIA')).toBe(true);
    expect(coincideUsuario(carlos, 'encordados.com')).toBe(true);
    expect(coincideUsuario(carlos, 'maria')).toBe(false);
  });
});
