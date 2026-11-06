import { contiene, normalizar } from './texto';

describe('normalizar', () => {
  it('quita acentos y mayúsculas', () => {
    expect(normalizar('Martínez ÁÉÍÓÚ Ñ')).toBe('martinez aeiou n');
  });
});

describe('contiene', () => {
  const campos = ['Juan Martínez', 'jugador_juan', 'juan@tenis.com', null];

  it.each(['juan', 'JUAN', 'mart', 'MARTINEZ', 'martínez', 'tenis.com', '_ju'])(
    'encuentra "%s" en cualquier posición',
    (termino) => {
      expect(contiene(campos, termino)).toBe(true);
    },
  );

  it('no encuentra lo que no está', () => {
    expect(contiene(campos, 'pérez')).toBe(false);
  });

  it('sin término coincide todo', () => {
    expect(contiene(campos, '  ')).toBe(true);
  });
});
