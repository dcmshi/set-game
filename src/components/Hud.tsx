import { useT } from '../i18n/LanguageContext';

interface HudProps {
  deckCount: number;
  mistakes: number;
  setsFound: number;
  onHint: () => void;
  hintDisabled: boolean;
}

export function Hud({ deckCount, mistakes, setsFound, onHint, hintDisabled }: HudProps) {
  const { t } = useT();
  return (
    <div className="hud">
      <span className="hud-item">{t('hud.deck')} <strong>{deckCount}</strong></span>
      {/* key remounts the counter on each find so the pop animation replays. */}
      <span className="hud-item">{t('hud.sets')} <strong key={setsFound} className="sets-count">{setsFound}</strong></span>
      <span className="hud-item">{t('hud.mistakes')} <strong>{mistakes}</strong></span>
      <button type="button" className="hint-btn" onClick={onHint} disabled={hintDisabled}>
        {t('hud.hint')}
      </button>
    </div>
  );
}
