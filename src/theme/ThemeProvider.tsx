import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import type { ThemePreference } from '../domain/types';
import { THEME_KEY } from '../data/persistence';
import { darkPalette, lightPalette, type Palette } from './tokens';

type ThemeValue = {
  scheme: 'light' | 'dark';
  colors: Palette;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    void AsyncStorage.getItem(THEME_KEY).then((value) => {
      if (value === 'light' || value === 'dark' || value === 'system') setPreferenceState(value);
    });
  }, []);

  const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const colors = scheme === 'dark' ? darkPalette : lightPalette;

  const value = useMemo<ThemeValue>(
    () => ({
      scheme,
      colors,
      preference,
      setPreference: (next) => {
        setPreferenceState(next);
        void AsyncStorage.setItem(THEME_KEY, next);
      },
    }),
    [scheme, colors, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider');
  return value;
}
