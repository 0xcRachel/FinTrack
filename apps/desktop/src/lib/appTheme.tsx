import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { injectWaveTransition } from './themeWave';

export type AppTheme = 'light' | 'dark';
interface ThemeOrigin { x: number; y: number }
interface AppThemeValue {
  theme: AppTheme;
  toggle: (origin?: ThemeOrigin) => void;
}
const STORAGE_KEY = 'fintrack_app_theme';
const Context = createContext<AppThemeValue | null>(null);

function initialTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* storage unavailable */
  }
  return 'light';
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(initialTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage unavailable */ }
  }, [theme]);

  const toggle = useCallback((origin?: ThemeOrigin) => {
    const next: AppTheme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? window.innerHeight / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    if ('startViewTransition' in document && !reduced) {
      injectWaveTransition(x, y, radius, next);
      root.dataset.themeTransition = 'wave';
      const transition = document.startViewTransition(() => {
        flushSync(() => setTheme(next));
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
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppTheme(): AppThemeValue {
  const context = useContext(Context);
  if (!context) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return context;
}
