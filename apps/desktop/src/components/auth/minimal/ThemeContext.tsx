import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { injectWaveTransition } from '../../../lib/themeWave';

export type AuthTheme = 'dark' | 'light';
interface ThemeOrigin { x: number; y: number }
interface AuthThemeValue {
  theme: AuthTheme;
  toggle: (origin?: ThemeOrigin) => void;
}
const STORAGE_KEY = 'fintrack_auth_theme';
const ThemeContext = createContext<AuthThemeValue | null>(null);

function initialTheme(): AuthTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage unavailable */
  }
  return 'dark';
}

export function AuthThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AuthTheme>(initialTheme);

  const toggle = useCallback((origin?: ThemeOrigin) => {
    const next: AuthTheme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? window.innerHeight / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.style.setProperty('--theme-x', `${x}px`);
    root.style.setProperty('--theme-y', `${y}px`);
    root.style.setProperty('--theme-radius', `${radius}px`);

    const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    if ('startViewTransition' in document && !reduced) {
      injectWaveTransition(x, y, radius, next);
      root.dataset.themeTransition = 'wave';
      const transition = document.startViewTransition(() => {
        flushSync(() => setTheme(next));
        try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable */ }
      });
      const cleanup = () => { delete root.dataset.themeTransition; };
      const fallback = window.setTimeout(cleanup, 1600);
      transition.finished.finally(() => {
        window.clearTimeout(fallback);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(cleanup);
        });
      });
    } else {
      setTheme(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable */ }
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAuthTheme(): AuthThemeValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAuthTheme must be used inside AuthThemeProvider');
  return context;
}
