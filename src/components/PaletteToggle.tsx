import { useState } from 'react';
import { useT } from '../i18n/LanguageContext';
import { applyPalette, getStoredPalette, setStoredPalette, type Palette } from '../theme/palette';

/**
 * The button shows the three suit colours it is about to change, so the effect
 * of pressing it is visible without reading the label. State is read from
 * storage on mount rather than shared through a context: the start screen and
 * the in-game top bar each render one, and never both at once.
 */
export function PaletteToggle() {
  const { t } = useT();
  const [palette, setPalette] = useState<Palette>(getStoredPalette);

  const swap = () => {
    const next: Palette = palette === 'classic' ? 'colorblind' : 'classic';
    setPalette(next);
    setStoredPalette(next);
    applyPalette(next);
  };

  return (
    <button
      type="button"
      className="icon-btn palette-btn"
      aria-label={t('palette.aria')}
      aria-pressed={palette === 'colorblind'}
      onClick={swap}
    >
      <span className="palette-dot color-red" />
      <span className="palette-dot color-green" />
      <span className="palette-dot color-purple" />
    </button>
  );
}
