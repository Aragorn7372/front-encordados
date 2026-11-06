import { CuerdaDto } from '../dto/cordaje.dto';
import { coincideCordaje, toCordaje, toCordajeFormValue, toCuerdaFormData } from './cordaje.mapper';

const dto: CuerdaDto = {
  id: 1,
  tournamentId: 't1',
  marca: 'Babolat',
  modelo: 'RPM Blast',
  stock: 50,
  precio: 19.99,
  stringFormat: 'Reel',
  stringsType: 'Polyester',
  calibre: 1.25,
  imageUrl: 'img.png',
};

describe('cordaje.mapper', () => {
  const rpm = toCordaje(dto);

  it('traduce el DTO', () => {
    expect(rpm).toMatchObject({
      formato: 'Reel',
      tipo: 'Polyester',
      calibre: 1.25,
      imagen: 'img.png',
    });
  });

  it.each(['rpm', 'BABOLAT', 'blast', 'poliester', 'bobina'])('encuentra "%s"', (termino) => {
    expect(coincideCordaje(rpm, termino)).toBe(true);
  });

  it('no encuentra lo que no es', () => {
    expect(coincideCordaje(rpm, 'tripa')).toBe(false);
  });

  it('el multipart lleva todos los campos con los nombres del backend', () => {
    const form = toCuerdaFormData({ ...toCordajeFormValue(rpm), stock: 0 }, 't1');

    expect(Object.fromEntries(form as unknown as Iterable<[string, string]>)).toEqual({
      TournamentId: 't1',
      Marca: 'Babolat',
      Modelo: 'RPM Blast',
      Stock: '0',
      Precio: '19.99',
      StringFormat: 'Reel',
      StringsType: 'Polyester',
      Calibre: '1.25',
    });
  });

  it('al editar no manda el torneo, y la imagen solo si hay una nueva', () => {
    const imagen = new File(['x'], 'rpm.png', { type: 'image/png' });
    const form = toCuerdaFormData({ ...toCordajeFormValue(rpm), imagen });

    expect(form.has('TournamentId')).toBe(false);
    expect(form.get('Imagen')).toBeInstanceOf(File);
  });
});
