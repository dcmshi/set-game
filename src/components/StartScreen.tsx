import { formatTime } from '../lib/format';
import { useT } from '../i18n/LanguageContext';
import { LanguageToggle } from './LanguageToggle';

interface StartScreenProps {
  bestMs: number | null;
  onStart: () => void;
  onHowToPlay: () => void;
}

export function StartScreen({ bestMs, onStart, onHowToPlay }: StartScreenProps) {
  const { t } = useT();
  return (
    <div className="screen start-screen">
      <div className="start-topline">
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
    </div>
  );
}
