import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilePicker } from './file-picker';

describe('FilePicker', () => {
  let fixture: ComponentFixture<FilePicker>;
  let emitted: (File | null)[];

  const element = () => fixture.nativeElement as HTMLElement;
  const image = () => element().querySelector('img');

  const choose = async (file: File | null) => {
    const input = element().querySelector('input')!;
    Object.defineProperty(input, 'files', { configurable: true, value: file ? [file] : [] });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  const png = (name = 'logo.png') => new File(['x'], name, { type: 'image/png' });

  beforeEach(async () => {
    let next = 0;
    URL.createObjectURL = vi.fn(() => `blob:vista-${++next}`);
    URL.revokeObjectURL = vi.fn();
    emitted = [];
    fixture = TestBed.createComponent(FilePicker);
    fixture.componentRef.setInput('label', 'Logotipo');
    fixture.componentInstance.fileSelected.subscribe((file) => emitted.push(file));
    await fixture.whenStable();
  });

  it('sin imagen no muestra vista previa', () => {
    expect(image()).toBeNull();
  });

  it('muestra la imagen actual', async () => {
    fixture.componentRef.setInput('currentImage', 'https://cdn.test/logo.png');
    await fixture.whenStable();

    expect(image()?.getAttribute('src')).toBe('https://cdn.test/logo.png');
  });

  it('previsualiza la foto elegida antes de subirla y la emite', async () => {
    const file = png();
    fixture.componentRef.setInput('currentImage', 'https://cdn.test/logo.png');

    await choose(file);

    expect(image()?.getAttribute('src')).toBe('blob:vista-1');
    expect(emitted).toEqual([file]);
  });

  it('libera la vista previa anterior al cambiar de foto', async () => {
    await choose(png());
    await choose(png('otra.png'));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:vista-1');
    expect(image()?.getAttribute('src')).toBe('blob:vista-2');
  });

  it('al quitar la selección vuelve a la imagen actual', async () => {
    fixture.componentRef.setInput('currentImage', 'https://cdn.test/logo.png');
    await choose(png());

    await choose(null);

    expect(image()?.getAttribute('src')).toBe('https://cdn.test/logo.png');
    expect(emitted.at(-1)).toBeNull();
  });

  it('no intenta previsualizar un fichero que no es imagen', async () => {
    await choose(new File(['x'], 'datos.xlsx'));

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(image()).toBeNull();
  });

  it('libera la memoria al destruirse', async () => {
    await choose(png());

    fixture.destroy();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:vista-1');
  });
});
