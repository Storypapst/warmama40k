import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

// Mock window.matchMedia for test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light-theme', 'dark-theme');

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });
    service = TestBed.inject(ThemeService);
  });

  it('should default to dark theme when no preference saved', () => {
    expect(service.mode()).toBe('dark');
  });

  it('should toggle from dark to light', () => {
    service.mode.set('dark');
    service.toggle();
    expect(service.mode()).toBe('light');
  });

  it('should toggle from light to dark', () => {
    service.mode.set('light');
    service.toggle();
    expect(service.mode()).toBe('dark');
  });

  it('should persist theme choice to localStorage', () => {
    TestBed.flushEffects();
    expect(localStorage.getItem('warmama-theme')).toBeTruthy();
  });

  it('should load saved light preference from localStorage', () => {
    localStorage.setItem('warmama-theme', 'light');
    expect(localStorage.getItem('warmama-theme')).toBe('light');
  });
});
