import { formatTime } from '../lib/format';

interface WinModalProps {
  timeMs: number;
  bestMs: number;
  isRecord: boolean;
  onPlayAgain: () => void;
}

export function WinModal({ timeMs, bestMs, isRecord, onPlayAgain }: WinModalProps) {
  return (
    <div className="screen win-modal" role="dialog" aria-modal="true" aria-label="You won">
      <h2>Deck cleared!</h2>
      <p className="final-time">{formatTime(timeMs)}</p>
      {isRecord && <p className="record-badge">New record! 🎉</p>}
      <p className="best">Best time {formatTime(bestMs)}</p>
      <button type="button" className="primary-btn" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
}
