export const PALETTES = ['classic', 'colorblind'] as const;
export type Palette = (typeof PALETTES)[number];

const KEY = 'set-game:palette';

export function isPalette(value: unknown): value is Palette {
  return typeof value === 'string' && (PALETTES as readonly string[]).includes(value);
}

export function getStoredPalette(): Palette {
  try {
    const raw = localStorage.getItem(KEY);
    return isPalette(raw) ? raw : 'classic';
  } catch {
    return 'classic';
  }
}

export function setStoredPalette(palette: Palette): void {
  try {
    localStorage.setItem(KEY, palette);
  } catch {
    /* storage unavailable — ignore */
  }
}

/**
 * Suit colours are CSS variables and the shapes paint with currentColor, so
 * switching palettes is a single attribute on the root element.
 */
export function applyPalette(palette: Palette): void {
  document.documentElement.dataset.palette = palette;
}
