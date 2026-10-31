import { toPageParams } from './page';

describe('toPageParams', () => {
  it('envía la página y el tamaño', () => {
    expect(toPageParams({ page: 2, size: 20 }).toString()).toBe('page=2&size=20');
  });

  it('usa pageSize para los endpoints de torneos', () => {
    expect(toPageParams({ page: 0, size: 12 }, 'pageSize').toString()).toBe('page=0&pageSize=12');
  });

  it('incluye orden y búsqueda sin espacios sobrantes', () => {
    const params = toPageParams({
      page: 0,
      size: 10,
      sortBy: 'name',
      direction: 'desc',
      search: '  madrid ',
    });
    expect(params.get('sortBy')).toBe('name');
    expect(params.get('direction')).toBe('desc');
    expect(params.get('search')).toBe('madrid');
  });

  it('omite una búsqueda vacía', () => {
    expect(toPageParams({ page: 0, size: 10, search: '   ' }).has('search')).toBe(false);
  });
});
