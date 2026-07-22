/**
 * Thema-voorkeur (25_DesignSystem.md § 7): licht/donker/systeem, door de
 * gebruiker instelbaar via ThemeToggle. Losstaand van elke Bedrijfsinstelling —
 * dit is een sessie-brede, per-device UI-voorkeur (localStorage), geen
 * `companies.config_json`-veld.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'servops-theme';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

/** Lost 'system' op naar een concrete 'light'/'dark' o.b.v. de OS-voorkeur. */
export function resolveTheme(preference: ThemePreference, prefersDark: boolean): 'light' | 'dark' {
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}

/**
 * Inline anti-flits-script (as-string, voor een blocking <script> in <head>):
 * moet vóór de eerste paint draaien, dus geen import van bovenstaande helpers
 * (die zouden pas na hydratie beschikbaar zijn). Bewust gedupliceerde, minimale
 * logica — zie app/layout.tsx.
 */
export function buildThemeInitScript(): string {
  return `(function(){try{var k='${THEME_STORAGE_KEY}';var s=localStorage.getItem(k);var p=(s==='light'||s==='dark'||s==='system')?s:'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`;
}
