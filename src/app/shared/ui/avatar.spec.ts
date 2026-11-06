import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Avatar, iniciales, miniatura } from './avatar';

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
