import { OP_CORDAJE } from '../model/cordaje-operacion.model';
import { Cordaje, CordajeFormValue } from '../model/cordaje.model';
import { aplicarPendientes, cordajeDeOperacion } from './cordaje-pendiente';

const rpm: Cordaje = {
  id: 1,
  marca: 'Babolat',
  modelo: 'RPM Blast',
  stock: 10,
  precio: 20,
  formato: 'Reel',
  tipo: 'Polyester',
  calibre: 1.25,
  imagen: 'https://img/rpm.png',
};
const value = (cambios: Partial<CordajeFormValue>): CordajeFormValue => ({
  marca: 'Babolat',
  modelo: 'RPM Blast',
  stock: 10,
  precio: 20,
  formato: 'Reel',
  tipo: 'Polyester',
  calibre: 1.25,
  imagen: null,
  ...cambios,
});

describe('aplicarPendientes (cordajes)', () => {
  it('varios ± de stock sin enviar: se ve el último', () => {
    const [cordaje] = aplicarPendientes(
      [rpm],
      [
        { tipo: OP_CORDAJE.editar, payload: { id: 1, value: value({ stock: 9 }) } },
        { tipo: OP_CORDAJE.editar, payload: { id: 1, value: value({ stock: 8 }) } },
      ],
    );
    expect(cordaje.stock).toBe(8);
  });

  it('una imagen nueva aún sin enviar no cambia la que se ve', () => {
    const imagen = new File(['x'], 'nueva.png');
    const [cordaje] = aplicarPendientes(
      [rpm],
      [{ tipo: OP_CORDAJE.editar, payload: { id: 1, value: value({ precio: 22, imagen }) } }],
    );
    expect([cordaje.precio, cordaje.imagen]).toEqual([22, 'https://img/rpm.png']);
  });

  it('borrado sin enviar ya no se ve, y los cambios de otros tipos se ignoran', () => {
    expect(aplicarPendientes([rpm], [{ tipo: OP_CORDAJE.borrar, payload: { id: 1 } }])).toEqual([]);
    expect(aplicarPendientes([rpm], [{ tipo: 'material.borrar', payload: { id: 1 } }])).toEqual([
      rpm,
    ]);
    expect(cordajeDeOperacion({ tipo: 'material.borrar', payload: { id: 1 } })).toBeNull();
  });
});
