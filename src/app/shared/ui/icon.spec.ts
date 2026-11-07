import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';

describe('Icon', () => {
  function crear(name: string) {
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', name);
    fixture.detectChanges();
    return fixture;
  }

  it('dibuja un SVG que toma el color del texto', () => {
    const svg = crear('pedido').nativeElement.querySelector('svg') as SVGElement;

    expect(svg).not.toBeNull();
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('width')).toBe('1.25em');
    expect(svg.children.length).toBeGreaterThan(0);
  });

  it('está oculto para los lectores de pantalla (el texto lo pone el botón)', () => {
    expect(crear('menu').nativeElement.getAttribute('aria-hidden')).toBe('true');
  });

  it('cambia de dibujo al cambiar el nombre, sin acumular SVG', () => {
    const fixture = crear('sol');
    const antes = fixture.nativeElement.innerHTML;

    fixture.componentRef.setInput('name', 'luna');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('svg').length).toBe(1);
    expect(fixture.nativeElement.innerHTML).not.toBe(antes);
  });
});
