import { formatTime } from '../lib/format';
import { useT } from '../i18n/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { PaletteToggle } from './PaletteToggle';
import { ThemeToggle } from './ThemeToggle';

interface StartScreenProps {
  bestMs: number | null;
  onStart: () => void;
  onHowToPlay: () => void;
  onMultiplayer: () => void;
}

export function StartScreen({ bestMs, onStart, onHowToPlay, onMultiplayer }: StartScreenProps) {
  const { t } = useT();
  return (
    <>
      <div className="screen start-screen">
        <div className="start-topline">
          <ThemeToggle />
          <PaletteToggle />
          <LanguageToggle />
        </div>
        <div className="brand">
          <div className="brand-glyphs" aria-hidden="true">
            <span className="glyph glyph-solid" />
            <span className="glyph glyph-striped" />
            <span className="glyph glyph-open" />
          </div>
          <h1>Set</h1>
        </div>
        <p className="tagline">{t('start.tagline')}</p>
        <ul className="how-to">
          <li>{t('start.rule1')}</li>
          <li>{t('start.rule2')}</li>
          <li>{t('start.rule3')}</li>
        </ul>
        {bestMs !== null && <p className="best">{t('start.best', { time: formatTime(bestMs) })}</p>}
        <button type="button" className="primary-btn" onClick={onStart}>
          {t('start.startBtn')}
        </button>
        <button type="button" className="text-btn" onClick={onHowToPlay}>
          {t('start.howToPlayBtn')}
        </button>
        <button type="button" className="text-btn" onClick={onMultiplayer}>
          {t('start.multiplayerBtn')}
        </button>
        <div className="meta-links">
          <a href="https://github.com/sponsors/dcmshi" target="_blank" rel="noopener noreferrer">
            {t('start.supportLink')}
          </a>
          <span aria-hidden="true">·</span>
          <a href="https://github.com/dcmshi/set-game" target="_blank" rel="noopener noreferrer">
            {t('start.sourceLink')}
          </a>
        </div>
      </div>
      <a className="scroll-cue" href="#site-content">
        <span>{t('start.scrollCue')}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </>
  );
}
