import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { guardarFichero, nombreDeFichero } from './download';

describe('descargas', () => {
  const response = (disposition?: string) =>
    new HttpResponse<Blob>({
      body: new Blob(['x']),
      headers: disposition ? new HttpHeaders({ 'Content-Disposition': disposition }) : undefined,
    });

  it('usa el nombre que propone el servidor', () => {
    expect(nombreDeFichero(response('attachment; filename=torneo_1.xlsx'), 'x.xlsx')).toBe(
      'torneo_1.xlsx',
    );
  });

  it('prefiere el nombre UTF-8 si viene', () => {
    expect(
      nombreDeFichero(
        response("attachment; filename=a.xlsx; filename*=UTF-8''torneo%20espa%C3%B1a.xlsx"),
        'x.xlsx',
      ),
    ).toBe('torneo españa.xlsx');
  });

  it('sin cabecera usa el nombre por defecto', () => {
    expect(nombreDeFichero(response(), 'pedidos.xlsx')).toBe('pedidos.xlsx');
  });

  it('descarga y libera el blob', () => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    guardarFichero(new Blob(['x']), 'a.xlsx');
    vi.runAllTimers();

    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    vi.useRealTimers();
  });
});
