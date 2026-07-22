'use client';

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';

import { THEME_STORAGE_KEY, isThemePreference, type ThemePreference } from '@/lib/theme/constants';

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(preference: ThemePreference) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
  document.documentElement.setAttribute('data-theme', resolved);
}

// Eén localStorage-key, dus één gedeelde subscriber-set volstaat i.p.v. een
// per-instance abonnement — voorkomt bovendien dat setPreference() zelf een
// setState-in-effect-anti-patroon nodig heeft (react-hooks/set-state-in-effect).
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  const onStorageEvent = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener('storage', onStorageEvent);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener('storage', onStorageEvent);
  };
}

function getClientSnapshot(): ThemePreference {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(stored) ? stored : 'system';
}

function getServerSnapshot(): ThemePreference {
  return 'system';
}

/**
 * ThemeProvider (25_DesignSystem.md § 7) — beheert de licht/donker/systeem-
 * voorkeur. `useSyncExternalStore` i.p.v. useState+useEffect: localStorage is
 * een external store die op de server niet bestaat (`getServerSnapshot`
 * geeft altijd 'system' terug voor SSR/hydratie); React herstelt zelf de
 * client-waarde na hydratie, zonder het setState-in-effect-antipatroon.
 * De eigenlijke eerste-paint-toepassing gebeurt al door het inline script in
 * app/layout.tsx (vóór hydratie) — deze provider synchroniseert React-state
 * ermee en herevalueert bij live OS-thema-wisselingen zolang de voorkeur
 * 'system' is.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    applyTheme(preference);
    if (preference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    listeners.forEach((listener) => listener());
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme() moet binnen een <ThemeProvider> gebruikt worden.');
  return context;
}
