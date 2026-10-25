/**
 * The theme rules, kept pure so the provider, the toggle and the inline
 * no-flash script can all be checked against one set of behaviours.
 *
 * The user's choice is one of light, dark or system, stored under
 * `localStorage.theme`. Anything that is not an explicit light or dark choice
 * follows the OS, so an empty or unreadable store means "system".
 */

export const THEME_STORAGE_KEY = 'theme';

export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export type ThemeSetting = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export function isThemeSetting(value: unknown): value is ThemeSetting {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** The theme that is actually painted. */
export function resolveTheme(setting: string | null | undefined, prefersDark: boolean): ResolvedTheme {
  if (setting === 'dark') return 'dark';
  if (setting === 'light') return 'light';
  return prefersDark ? 'dark' : 'light';
}

/** The order the navbar toggle cycles through: light, dark, system, light. */
export function nextThemeSetting(current: ThemeSetting): ThemeSetting {
  if (current === 'light') return 'dark';
  if (current === 'dark') return 'system';
  return 'light';
}

/**
 * Inlined into <head> by app/layout.tsx so the `dark` class is on <html>
 * before first paint. It must agree with resolveTheme(); the test runs this
 * string against stubs to hold it to that.
 */
export const THEME_INIT_SCRIPT = `(function(){var t=null;try{t=localStorage.getItem('${THEME_STORAGE_KEY}');}catch(e){}var d=t==='dark'||(t!=='light'&&window.matchMedia('${DARK_SCHEME_QUERY}').matches);document.documentElement.classList.toggle('dark',d);})();`;
