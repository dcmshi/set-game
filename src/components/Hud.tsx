import { useT } from '../i18n/LanguageContext';

interface HudProps {
  deckCount: number;
  mistakes: number;
  onHint: () => void;
  hintDisabled: boolean;
}

export function Hud({ deckCount, mistakes, onHint, hintDisabled }: HudProps) {
  const { t } = useT();
  return (
    <div className="hud">
      <span className="hud-item">{t('hud.deck')} <strong>{deckCount}</strong></span>
      <span className="hud-item">{t('hud.mistakes')} <strong>{mistakes}</strong></span>
      <button type="button" className="hint-btn" onClick={onHint} disabled={hintDisabled}>
        {t('hud.hint')}
      </button>
    </div>
  );
}
