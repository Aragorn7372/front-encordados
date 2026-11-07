import { esEmail, esTelefono, opcional } from './validacion';

describe('validacion', () => {
  it.each(['ana@tenis.com', 'a.b@c.co.uk', '  ana@tenis.com '])('"%s" es un email', (texto) => {
    expect(esEmail(texto)).toBe(true);
  });

  it.each(['ana@', 'ana@tenis', '@tenis.com', 'ana tenis@x.com', 'ana@tenis..com'])(
    '"%s" no lo es',
    (texto) => {
      expect(esEmail(texto)).toBe(false);
    },
  );

  it('un texto muy largo no lo cuelga', () => {
    const inicio = performance.now();
    esEmail(`${'a'.repeat(5000)}@${'b.'.repeat(5000)}`);
    expect(performance.now() - inicio).toBeLessThan(100);
  });

  it.each(['34612345678', '+34 612 345 678', '34-612-345-678'])('"%s" es un teléfono', (t) => {
    expect(esTelefono(t)).toBe(true);
  });

  it.each(['612', '0034612345678', 'abc'])('"%s" no lo es', (t) => {
    expect(esTelefono(t)).toBe(false);
  });

  it('opcional: vacío vale, mal escrito no', () => {
    expect(opcional('  ', esEmail)).toBe(true);
    expect(opcional('ana@', esEmail)).toBe(false);
  });
});
