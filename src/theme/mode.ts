export const MODES = ['light', 'dark'] as const;
export type Mode = (typeof MODES)[number];

const KEY = 'set-game:theme';
const DARK = '(prefers-color-scheme: dark)';

export function isMode(value: unknown): value is Mode {
  return typeof value === 'string' && (MODES as readonly string[]).includes(value);
}

/**
 * Null rather than a default, because "unset" and "light" are different states:
 * a player on a dark OS who has never chosen is looking at dark, so the first
 * press has to produce light.
 */
export function getStoredMode(): Mode | null {
  try {
    const raw = localStorage.getItem(KEY);
    return isMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setStoredMode(mode: Mode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* storage unavailable — ignore */
  }
}

export function systemPrefersDark(): boolean {
  return window.matchMedia?.(DARK).matches ?? false;
}

/** What the player is actually looking at. */
export function getEffectiveMode(): Mode {
  return getStoredMode() ?? (systemPrefersDark() ? 'dark' : 'light');
}

/**
 * Theme tokens are light-dark() pairs resolved from the root color-scheme, so
 * pinning a theme is one attribute on <html> — and removing it hands the page
 * back to the system setting.
 */
export function applyMode(mode: Mode | null): void {
  if (mode) document.documentElement.dataset.theme = mode;
  else delete document.documentElement.dataset.theme;
}

/** Subscribes to system theme changes; call the result to release it. */
export function watchSystemMode(onChange: (mode: Mode) => void): () => void {
  const mql = window.matchMedia?.(DARK);
  if (!mql) return () => {};
  const handler = (e: MediaQueryListEvent) => onChange(e.matches ? 'dark' : 'light');
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}
