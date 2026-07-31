import { useEffect, useRef } from 'react';
import { formatTime } from '../lib/format';
import { useT } from '../i18n/LanguageContext';
import { useModalFocus } from './useModalFocus';

interface WinModalProps {
  timeMs: number;
  bestMs: number;
  isRecord: boolean;
  onPlayAgain: () => void;
}

export function WinModal({ timeMs, bestMs, isRecord, onPlayAgain }: WinModalProps) {
  const { t } = useT();
  const dialogRef = useModalFocus<HTMLDivElement>();
  const playAgainRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    playAgainRef.current?.focus();
  }, []);

  return (
    <div className="modal-backdrop">
      <div
        className="screen win-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('win.dialogLabel')}
        ref={dialogRef}
      >
        <p className="win-eyebrow">{t('win.eyebrow')}</p>
        <h2>{t('win.title')}</h2>
        <p className="final-time">{formatTime(timeMs)}</p>
        {isRecord && <p className="record-badge">{t('win.record')}</p>}
        <p className="best">{t('win.best', { time: formatTime(bestMs) })}</p>
        <button type="button" className="primary-btn" onClick={onPlayAgain} ref={playAgainRef}>
          {t('win.playAgain')}
        </button>
      </div>
    </div>
  );
}
