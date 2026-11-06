import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-search-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      type="search"
      class="input w-full"
      [placeholder]="placeholder()"
      [attr.aria-label]="placeholder()"
      [value]="value()"
      (input)="onInput($event)"
    />
  `,
})
export class SearchInput implements OnInit {
  readonly placeholder = input('Buscar…');
  readonly delay = input(350);
  /** Valor inicial, por ejemplo el de la URL. */
  readonly value = input('');
  readonly searched = output<string>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly terms = new Subject<string>();

  ngOnInit() {
    // En ngOnInit porque `delay` es un input: en el constructor aún no tiene su valor
    this.terms
      .pipe(debounceTime(this.delay()), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.searched.emit(term));
  }

  protected onInput(event: Event) {
    this.terms.next((event.target as HTMLInputElement).value.trim());
  }
}
