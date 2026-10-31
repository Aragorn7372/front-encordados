import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Marcador temporal: cada ruta lo sustituye cuando se construye su feature. */
@Component({
  selector: 'app-coming-soon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-bold">{{ title }}</h1>
    <p class="mt-2 opacity-70">Esta sección está en construcción.</p>
  `,
})
export default class ComingSoon {
  protected readonly title = inject(ActivatedRoute).snapshot.title;
}
