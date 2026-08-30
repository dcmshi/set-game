import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../lib/format';
import { useT } from '../i18n/LanguageContext';
import { useModalFocus } from './useModalFocus';

interface WinModalProps {
  timeMs: number;
  bestMs: number;
  isRecord: boolean;
  previousBestMs: number | null;
  mistakes: number;
  hintsUsed: number;
  onPlayAgain: () => void;
}

export function WinModal({ timeMs, bestMs, isRecord, previousBestMs, mistakes, hintsUsed, onPlayAgain }: WinModalProps) {
  const { t } = useT();
  const dialogRef = useModalFocus<HTMLDivElement>();
  const playAgainRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    playAgainRef.current?.focus();
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const copyResult = async () => {
    const text = t('win.shareText', { time: formatTime(timeMs), mistakes, hints: hintsUsed });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (insecure context) — nothing to copy to */
    }
  };

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
        {isRecord && previousBestMs !== null && previousBestMs > timeMs && (
          <p className="record-delta">
            {t('win.recordDelta', { delta: formatTime(previousBestMs - timeMs) })}
          </p>
        )}
        <p className="best">{t('win.best', { time: formatTime(bestMs) })}</p>
        <p className="win-stats">
          <span>{t('hud.mistakes')} <strong>{mistakes}</strong></span>
          <span>{t('win.hints')} <strong>{hintsUsed}</strong></span>
        </p>
        <div className="win-actions">
          <button type="button" className="primary-btn" onClick={onPlayAgain} ref={playAgainRef}>
            {t('win.playAgain')}
          </button>
          <button type="button" className="text-btn" onClick={copyResult}>
            {copied ? t('win.copied') : t('win.copy')}
          </button>
        </div>
      </div>
    </div>
  );
}
