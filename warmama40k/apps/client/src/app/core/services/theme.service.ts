import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.loadSaved());

  constructor() {
    effect(() => {
      const m = this.mode();
      document.documentElement.classList.toggle('dark-theme', m === 'dark');
      document.documentElement.classList.toggle('light-theme', m === 'light');
      localStorage.setItem('warmama-theme', m);
    });
  }

  toggle(): void {
    this.mode.set(this.mode() === 'dark' ? 'light' : 'dark');
  }

  private loadSaved(): ThemeMode {
    const saved = localStorage.getItem('warmama-theme') as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
}
