import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TournamentContext } from '../../../../core/tournament-context/tournament-context';
import { MaterialesApi } from '../api/materiales.api';
import { Material } from '../model/material.model';
import { MaterialesStore } from './materiales.store';

const material = (id: number, stock: number, extra: Partial<Material> = {}): Material => ({
  id,
  marca: 'Babolat',
  modelo: `Modelo ${id}`,
  stock,
  precio: 3.99,
  tipo: 'Overgrip',
  imagen: '',
  ...extra,
});

describe('MaterialesStore', () => {
  const selectedId = signal<string | null>('t1');
  const api = {
    list: vi.fn(() => of({ materiales: [material(1, 10), material(2, 3)], total: 2 })),
    update: vi.fn((id: number, value: { stock: number }) =>
      of(material(id, value.stock, { precio: 4.5 })),
    ),
  };

  const setup = async () => {
    TestBed.configureTestingModule({
      providers: [
        MaterialesStore,
        { provide: MaterialesApi, useValue: api },
        { provide: TournamentContext, useValue: { selectedId } },
      ],
    });
    const store = TestBed.inject(MaterialesStore);
    await TestBed.inject(ApplicationRef).whenStable();
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    selectedId.set('t1');
  });

  it('carga los del torneo activo y sin torneo no pide nada', async () => {
    const store = await setup();
    expect(api.list).toHaveBeenCalledWith('t1');
    expect(store.todos()).toHaveLength(2);

    TestBed.resetTestingModule();
    vi.clearAllMocks();
    selectedId.set(null);
    await setup();
    expect(api.list).not.toHaveBeenCalled();
  });

  it('cuenta y filtra lo que tiene stock bajo', async () => {
    const store = await setup();

    expect(store.stockBajo().map((m) => m.id)).toEqual([2]);
    store.soloStockBajo.set(true);
    expect(store.materiales().map((m) => m.id)).toEqual([2]);
  });

  it('± stock cambia al momento y envía el material entero', async () => {
    const store = await setup();

    const ajuste = store.ajustarStock(store.todos()[0], 1);
    expect(store.todos()[0].stock).toBe(11);
    await ajuste;

    expect(api.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ stock: 11, precio: 3.99, marca: 'Babolat', tipo: 'Overgrip' }),
    );
    // Se queda con lo que devuelve el servidor
    expect(store.todos()[0].precio).toBe(4.5);
  });

  it('si el servidor falla, el stock vuelve a su valor', async () => {
    api.update.mockReturnValueOnce(throwError(() => ({ status: 500 })));
    const store = await setup();

    await store.ajustarStock(store.todos()[0], -1);

    expect(store.todos()[0].stock).toBe(10);
  });

  it('no baja de 0', async () => {
    const store = await setup();

    await store.ajustarStock(material(1, 0), -1);

    expect(api.update).not.toHaveBeenCalled();
  });
});
