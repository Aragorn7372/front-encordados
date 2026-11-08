import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarAnimado } from '../../core/theme/avatar-animado';
import { Avatar, blobDe, esFotoPorDefecto, iniciales, miniatura } from './avatar';

const CLOUDINARY =
  'https://res.cloudinary.com/dt0kvzlgb/image/upload/c_fill,f_auto,h_600,q_auto,w_800/avatar-photo-default_y1hcma';

describe('miniatura', () => {
  it('cambia la transformación de Cloudinary por una cuadrada y pequeña', () => {
    expect(miniatura(CLOUDINARY, 32)).toBe(
      'https://res.cloudinary.com/dt0kvzlgb/image/upload/c_fill,g_face,f_auto,q_auto,w_64,h_64/avatar-photo-default_y1hcma',
    );
  });

  it('una URL sin transformación también vale, con versión y carpeta', () => {
    expect(miniatura('https://res.cloudinary.com/x/image/upload/v123/usuarios/foto.png', 24)).toBe(
      'https://res.cloudinary.com/x/image/upload/c_fill,g_face,f_auto,q_auto,w_48,h_48/v123/usuarios/foto.png',
    );
  });

  it('un nombre de imagen con guion bajo no se toma por una transformación', () => {
    expect(miniatura('https://res.cloudinary.com/x/image/upload/img_foto', 32)).toBe(
      'https://res.cloudinary.com/x/image/upload/c_fill,g_face,f_auto,q_auto,w_64,h_64/img_foto',
    );
  });

  it('otra URL se deja tal cual', () => {
    expect(miniatura('https://ejemplo.com/foto.png', 32)).toBe('https://ejemplo.com/foto.png');
  });
});

describe('iniciales', () => {
  it.each([
    ['Juan Martínez', 'JM'],
    ['carlos_encordador', 'CE'],
    ['Ana', 'AN'],
    ['  ', '?'],
  ])('%s → %s', (nombre, esperado) => {
    expect(iniciales(nombre)).toBe(esperado);
  });
});

describe('Avatar', () => {
  let fixture: ComponentFixture<Avatar>;
  const element = () => fixture.nativeElement as HTMLElement;

  const render = async (url: string | null) => {
    fixture = TestBed.createComponent(Avatar);
    fixture.componentRef.setInput('url', url);
    fixture.componentRef.setInput('nombre', 'Juan Martínez');
    await fixture.whenStable();
  };

  it('enseña la foto en miniatura', async () => {
    await render(CLOUDINARY);
    expect(element().querySelector('img')!.getAttribute('src')).toContain('w_64,h_64');
  });

  it('sin foto, las iniciales', async () => {
    await render(null);
    expect(element().querySelector('img')).toBeNull();
    expect(element().textContent).toContain('JM');
  });

  it('si la foto no carga, las iniciales', async () => {
    await render(CLOUDINARY);
    element().querySelector('img')!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(element().querySelector('img')).toBeNull();
    expect(element().textContent).toContain('JM');
  });
});

describe('esFotoPorDefecto', () => {
  it.each([
    [CLOUDINARY, true],
    [
      'https://res.cloudinary.com/x/image/upload/c_fill,f_auto,h_600,q_auto,w_800/avatar-photo-default-user-icon-600nw-2558759027_y1hcma',
      true,
    ],
    ['https://res.cloudinary.com/x/image/upload/v1/usuarios/default.png', true],
    ['https://res.cloudinary.com/x/image/upload/v1/usuarios/abc123.jpg', false],
    ['https://ejemplo.com/foto.png', false],
  ])('%s → %s', (url, esperado) => {
    expect(esFotoPorDefecto(url)).toBe(esperado);
  });
});

describe('blobDe', () => {
  it('el mismo nombre da siempre el mismo blob (sin importar mayúsculas ni espacios)', () => {
    expect(blobDe('Juan Martínez')).toEqual(blobDe('  juan martínez '));
  });

  it('nombres distintos suelen dar blobs distintos', () => {
    const nombres = ['Ana', 'Luis', 'Marta', 'Pedro', 'Lucía', 'Carlos', 'Elena', 'Jorge'];
    const distintos = new Set(nombres.map((n) => JSON.stringify(blobDe(n))));
    expect(distintos.size).toBe(nombres.length);
  });

  it('da valores que blob-avatar entiende', () => {
    const blob = blobDe('carlos_encordador');
    expect(blob.color).toMatch(/^[0-9a-f]{6}$/);
    expect(blob.seed).toMatch(/^[0-9a-z]{1,6}$/);
  });
});

describe('Avatar animado', () => {
  let fixture: ComponentFixture<Avatar>;
  const element = () => fixture.nativeElement as HTMLElement;
  const FOTO = 'https://res.cloudinary.com/x/image/upload/v1/usuarios/abc123.jpg';

  beforeEach(() => TestBed.inject(AvatarAnimado).activo.set(true));
  afterEach(() => localStorage.clear());

  const render = async (url: string | null) => {
    fixture = TestBed.createComponent(Avatar);
    fixture.componentRef.setInput('url', url);
    fixture.componentRef.setInput('nombre', 'Juan Martínez');
    await fixture.whenStable();
  };

  it('con la foto por defecto, un blob con la forma y el color de su nombre', async () => {
    await render(CLOUDINARY);
    const blob = element().querySelector('blob-avatar')!;
    expect(element().querySelector('img')).toBeNull();
    expect(blob.getAttribute('shape')).toBe(blobDe('Juan Martínez').shape);
    expect(blob.getAttribute('color')).toBe(blobDe('Juan Martínez').color);
    expect(blob.getAttribute('aria-hidden')).toBe('true');
    expect(fixture.componentInstance.tieneFoto()).toBe(false);
  });

  it('sin foto, también el blob (en vez de las iniciales)', async () => {
    await render(null);
    expect(element().querySelector('blob-avatar')).not.toBeNull();
    expect(element().textContent).not.toContain('JM');
  });

  it('una foto de verdad se enseña siempre', async () => {
    await render(FOTO);
    expect(element().querySelector('img')).not.toBeNull();
    expect(element().querySelector('blob-avatar')).toBeNull();
    expect(fixture.componentInstance.tieneFoto()).toBe(true);
  });

  it('si la foto de verdad no carga, el blob', async () => {
    await render(FOTO);
    element().querySelector('img')!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(element().querySelector('blob-avatar')).not.toBeNull();
  });

  it('desactivado, vuelve la foto por defecto', async () => {
    await render(CLOUDINARY);
    TestBed.inject(AvatarAnimado).activo.set(false);
    await fixture.whenStable();
    expect(element().querySelector('blob-avatar')).toBeNull();
    expect(element().querySelector('img')).not.toBeNull();
  });
});
