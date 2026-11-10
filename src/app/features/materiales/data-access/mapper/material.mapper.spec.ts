import { MaterialDto } from '../dto/material.dto';
import {
  coincideMaterial,
  toMaterial,
  toMaterialFormData,
  toMaterialFormValue,
} from './material.mapper';

const dto: MaterialDto = {
  id: 2,
  tournamentId: 't1',
  marca: 'Babolat',
  modelo: 'Pro Overgrip',
  stock: 200,
  precio: 3.99,
  materialType: 'Overgrip',
  imageUrl: 'img.png',
};

describe('material.mapper', () => {
  const overgrip = toMaterial(dto);

  it('la respuesta trae materialType y el modelo lo llama tipo', () => {
    expect(overgrip.tipo).toBe('Overgrip');
  });

  it.each(['pro', 'OVERGRIP', 'babolat'])('encuentra "%s"', (termino) => {
    expect(coincideMaterial(overgrip, termino)).toBe(true);
  });

  it('busca también por el nombre en español del tipo', () => {
    const plomo = toMaterial({ ...dto, materialType: 'LeadTape', modelo: 'Tape 1/2' });
    expect(coincideMaterial(plomo, 'plomo')).toBe(true);
  });

  it('el ± de stock envía el stock pero no el precio (ENCUERDATU-69)', () => {
    const form = toMaterialFormData({ ...toMaterialFormValue(overgrip), stock: 0 }, undefined, true);

    expect(form.get('Stock')).toBe('0');
    expect(form.has('Precio')).toBe(false);
    // Marca, Modelo y Type siguen yendo: el backend los exige también al editar
    expect(form.get('Marca')).toBe(overgrip.marca);
    expect(form.get('Modelo')).toBe(overgrip.modelo);
    expect(form.get('Type')).toBe('Overgrip');
  });

  it('la petición lo llama Type, y una edición normal lleva precio y stock', () => {
    const form = toMaterialFormData({ ...toMaterialFormValue(overgrip), stock: 0 });

    expect(form.get('Type')).toBe('Overgrip');
    expect(form.get('Stock')).toBe('0');
    expect(form.get('Precio')).toBe('3.99');
    expect(form.has('MaterialType')).toBe(false);
  });
});
