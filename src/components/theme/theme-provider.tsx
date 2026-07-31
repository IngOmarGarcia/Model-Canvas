'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DEFAULT_THEME, isTheme, THEME_STORAGE_KEY, type ThemeKey } from '@/lib/theme';

interface ThemeContextValue {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
}: {
  children: React.ReactNode;
  /** Tema por defecto de la organización; se usa si el usuario no ha elegido. */
  defaultTheme?: ThemeKey;
}) {
  const [theme, setThemeState] = useState<ThemeKey>(defaultTheme);

  // El atributo ya lo escribió el script inline; aquí solo se sincroniza el estado.
  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) setThemeState(stored);
  }, []);

  const setTheme = useCallback((next: ThemeKey) => {
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return context;
}
