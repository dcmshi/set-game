import { isLang, type Lang } from './detectLang';

const KEY = 'set-game:lang';

export function getStoredLang(): Lang | null {
  try {
    const raw = localStorage.getItem(KEY);
    return isLang(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setStoredLang(lang: Lang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* storage unavailable — ignore */
  }
}
