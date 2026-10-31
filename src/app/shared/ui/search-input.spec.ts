import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchInput } from './search-input';

describe('SearchInput', () => {
  let fixture: ComponentFixture<SearchInput>;
  let searches: string[];

  const type = (value: string) => {
    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    searches = [];
    fixture = TestBed.createComponent(SearchInput);
    fixture.componentInstance.searched.subscribe((term) => searches.push(term));
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('espera a que el usuario deje de escribir', () => {
    type('ma');
    vi.advanceTimersByTime(200);
    type('mad');
    vi.advanceTimersByTime(349);
    expect(searches).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(searches).toEqual(['mad']);
  });

  it('no repite la búsqueda si el texto acaba igual', () => {
    type('mad');
    vi.advanceTimersByTime(350);
    type('madr');
    type('mad ');
    vi.advanceTimersByTime(350);
    expect(searches).toEqual(['mad']);
  });

  it('deja de emitir al destruirse', () => {
    type('mad');
    fixture.destroy();
    vi.advanceTimersByTime(350);
    expect(searches).toEqual([]);
  });
});
