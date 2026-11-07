import { sustituirIds, temporalesEn } from './outbox';

describe('sustituirIds / temporalesEn', () => {
  it('cambia los ids temporales que ya tienen id real, en cualquier nivel', () => {
    const payload = { pedido: { playerName: 'tmp-1', lineas: [{ id: 'tmp-1~0' }] }, otro: 'x' };

    expect(sustituirIds(payload, { 'tmp-1': 'luis', 'tmp-1~0': 'l1' })).toEqual({
      pedido: { playerName: 'luis', lineas: [{ id: 'l1' }] },
      otro: 'x',
    });
    expect(temporalesEn(payload)).toEqual(['tmp-1', 'tmp-1~0']);
  });

  it('un fichero (la imagen de un cordaje) se deja tal cual: no se convierte en un objeto vacío', () => {
    const imagen = new File(['x'], 'rpm.png', { type: 'image/png' });

    const resultado = sustituirIds({ id: 1, value: { imagen } }, { 'tmp-1': 'real' });

    expect(resultado.value.imagen).toBe(imagen);
    expect(temporalesEn({ value: { imagen } })).toEqual([]);
  });
});
