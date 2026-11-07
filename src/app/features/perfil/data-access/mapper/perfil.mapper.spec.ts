import { PerfilFormValue } from '../model/perfil.model';
import { cambiaUsername, hayCambios, toPerfilFormData } from './perfil.mapper';

const actual = { nombre: 'Juan Martínez', username: 'jugador_juan' };
const sinCambios: PerfilFormValue = { ...actual, email: '', telefono: '' };
const campos = (form: FormData) =>
  Object.fromEntries(form as unknown as Iterable<[string, string]>);

describe('perfil.mapper', () => {
  it('sin cambios no envía nada', () => {
    expect(campos(toPerfilFormData(sinCambios, actual, null))).toEqual({});
    expect(hayCambios(sinCambios, actual, null)).toBe(false);
  });

  it('solo envía lo que cambia, recortado', () => {
    const form = toPerfilFormData(
      { ...sinCambios, nombre: ' Juan M. ', email: ' juan@nuevo.com ' },
      actual,
      null,
    );
    expect(campos(form)).toEqual({ Name: 'Juan M.', Email: 'juan@nuevo.com' });
  });

  it('borrar el nombre no lo borra en el backend: vacío no se envía', () => {
    expect(campos(toPerfilFormData({ ...sinCambios, nombre: '  ' }, actual, null))).toEqual({});
  });

  it('la foto nueva cuenta como cambio', () => {
    const avatar = new File(['x'], 'yo.png', { type: 'image/png' });
    expect(hayCambios(sinCambios, actual, avatar)).toBe(true);
    expect(toPerfilFormData(sinCambios, actual, avatar).get('Avatar')).toBeInstanceOf(File);
  });

  it('detecta el cambio de username, que obliga a volver a entrar', () => {
    expect(cambiaUsername({ ...sinCambios, username: 'juan_m' }, actual)).toBe(true);
    expect(cambiaUsername({ ...sinCambios, username: ' jugador_juan ' }, actual)).toBe(false);
  });
});
