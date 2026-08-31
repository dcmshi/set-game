import { useT } from '../i18n/LanguageContext';

interface HudProps {
  deckCount: number;
  mistakes: number;
  setsFound: number;
  /** Deck empty and only a few cards left — the win-or-stall moment. */
  endgame: boolean;
  onHint: () => void;
  hintDisabled: boolean;
}

export function Hud({ deckCount, mistakes, setsFound, endgame, onHint, hintDisabled }: HudProps) {
  const { t } = useT();
  return (
    <div className="hud">
      <span className="hud-item">{t('hud.deck')} <strong>{deckCount}</strong></span>
      {/* key remounts the counter on each find so the pop animation replays. */}
      <span className="hud-item">{t('hud.sets')} <strong key={setsFound} className="sets-count">{setsFound}</strong></span>
      <span className="hud-item">{t('hud.mistakes')} <strong>{mistakes}</strong></span>
      {endgame && <span className="hud-item endgame-badge">{t('hud.finalCards')}</span>}
      <button type="button" className="hint-btn" onClick={onHint} disabled={hintDisabled}>
        {t('hud.hint')}
      </button>
    </div>
  );
}
