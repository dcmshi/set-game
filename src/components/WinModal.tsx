import { useEffect, useRef } from 'react';
import { formatTime } from '../lib/format';

interface WinModalProps {
  timeMs: number;
  bestMs: number;
  isRecord: boolean;
  onPlayAgain: () => void;
}

export function WinModal({ timeMs, bestMs, isRecord, onPlayAgain }: WinModalProps) {
  const playAgainRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    playAgainRef.current?.focus();
  }, []);

  return (
    <div className="modal-backdrop">
      <div className="screen win-modal" role="dialog" aria-modal="true" aria-label="You won">
        <p className="win-eyebrow">Deck cleared</p>
        <h2>Nice run!</h2>
        <p className="final-time">{formatTime(timeMs)}</p>
        {isRecord && <p className="record-badge">New record! 🎉</p>}
        <p className="best">Best time {formatTime(bestMs)}</p>
        <button type="button" className="primary-btn" onClick={onPlayAgain} ref={playAgainRef}>
          Play Again
        </button>
      </div>
    </div>
  );
}
