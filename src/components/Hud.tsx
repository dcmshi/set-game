interface HudProps {
  deckCount: number;
  mistakes: number;
  onHint: () => void;
  hintDisabled: boolean;
}

export function Hud({ deckCount, mistakes, onHint, hintDisabled }: HudProps) {
  return (
    <div className="hud">
      <span className="hud-item">Deck <strong>{deckCount}</strong></span>
      <span className="hud-item">Mistakes <strong>{mistakes}</strong></span>
      <button type="button" className="hint-btn" onClick={onHint} disabled={hintDisabled}>
        Hint (+15s)
      </button>
    </div>
  );
}
