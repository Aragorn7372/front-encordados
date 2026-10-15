import { Injectable, effect, signal, DOCUMENT, inject } from '@angular/core';

export type Theme = 'corporate' | 'black';
const KEY = 'etr_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  readonly theme = signal<Theme>(this.initial());

  constructor() {
    effect(() => {
      const t = this.theme();
      this.doc.documentElement.setAttribute('data-theme', t);
      localStorage.setItem(KEY, t);
    });
  }

  toggle() {
    this.theme.update((t) => (t === 'corporate' ? 'black' : 'corporate'));
  }

  private initial(): Theme {
    const saved = localStorage.getItem(KEY);
    if (saved === 'corporate' || saved === 'black') return saved;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'black' : 'corporate';
  }
}
