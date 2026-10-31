import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Paginator } from './paginator';

describe('Paginator', () => {
  let fixture: ComponentFixture<Paginator>;
  const changes: number[] = [];

  const render = async (page: number, totalPages: number) => {
    fixture = TestBed.createComponent(Paginator);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('totalPages', totalPages);
    changes.length = 0;
    fixture.componentInstance.pageChange.subscribe((value) => changes.push(value));
    await fixture.whenStable();
  };

  const button = (text: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) =>
      b.textContent?.includes(text),
    )!;

  it('con una sola página no se muestra', async () => {
    await render(0, 1);
    expect((fixture.nativeElement as HTMLElement).querySelector('nav')).toBeNull();
  });

  it('muestra la página empezando en 1 aunque el backend empiece en 0', async () => {
    await render(1, 5);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Página 2 de 5');
  });

  it('avanza y retrocede', async () => {
    await render(2, 5);
    button('Siguiente').click();
    button('Anterior').click();
    expect(changes).toEqual([3, 1]);
  });

  it('desactiva los extremos', async () => {
    await render(0, 2);
    expect(button('Anterior').disabled).toBe(true);
    expect(button('Siguiente').disabled).toBe(false);

    await render(1, 2);
    expect(button('Siguiente').disabled).toBe(true);
  });
});
