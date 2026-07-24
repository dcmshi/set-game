import { useT } from '../../i18n/LanguageContext';
import type { ScoreEntry } from '../../mp/protocol';

interface MpResultsProps {
  finalScores: ScoreEntry[];
  winnerIds: string[];
  isHost: boolean;
  onRematch(): void;
  onLeave(): void;
}

export function MpResults({ finalScores, winnerIds, isHost, onRematch, onLeave }: MpResultsProps) {
  const { t } = useT();
  const winnerName = finalScores.find((s) => s.id === winnerIds[0])?.name ?? '';
  const headline = winnerIds.length === 1 ? t('mp.winnerIs', { name: winnerName }) : t('mp.draw');

  return (
    <div className="screen mp-results">
      <p className="win-eyebrow">{t('mp.gameOver')}</p>
      <h2>{headline}</h2>
      <ul className="mp-final-scores">
        {finalScores.map((s) => (
          <li key={s.id} className={winnerIds.includes(s.id) ? 'mp-winner' : ''}>
            <span>{s.name}</span>
            <strong>{s.score}</strong>
          </li>
        ))}
      </ul>
      {isHost && (
        <button type="button" className="primary-btn" onClick={onRematch}>
          {t('mp.rematch')}
        </button>
      )}
      <button type="button" className="text-btn" onClick={onLeave}>
        {t('mp.leave')}
      </button>
    </div>
  );
}
