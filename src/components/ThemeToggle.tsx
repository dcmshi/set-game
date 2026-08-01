import { useEffect, useState } from 'react';
import { useT } from '../i18n/LanguageContext';
import {
  applyMode,
  getEffectiveMode,
  getStoredMode,
  setStoredMode,
  watchSystemMode,
  type Mode,
} from '../theme/mode';

function SunIcon() {
  return (
    <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.5 13.3A8.5 8.5 0 1 1 10.7 3.5a6.6 6.6 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

/**
 * The icon shows the theme the button is about to switch to, so the effect of
 * pressing it is visible without reading the label. State is read from storage
 * on mount rather than shared through a context: the start screen and the
 * in-game top bar each render one, and never both at once.
 */
export function ThemeToggle() {
  const { t } = useT();
  const [mode, setMode] = useState<Mode>(getEffectiveMode);

  // Until a choice is stored the button is only mirroring the OS, so it has to
  // follow a system flip — an OS that switches at sunset would otherwise leave
  // the wrong icon showing.
  useEffect(
    () =>
      watchSystemMode((next) => {
        if (!getStoredMode()) setMode(next);
      }),
    []
  );

  const swap = () => {
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    setStoredMode(next);
    applyMode(next);
  };

  return (
    <button
      type="button"
      className="icon-btn theme-btn"
      aria-label={t('theme.aria')}
      aria-pressed={mode === 'dark'}
      onClick={swap}
    >
      {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
