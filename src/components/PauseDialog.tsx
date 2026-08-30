import { useEffect, useRef } from 'react';
import { useT } from '../i18n/LanguageContext';
import { useModalFocus } from './useModalFocus';

interface PauseDialogProps {
  onResume(): void;
  onQuit(): void;
}

/**
 * Paused overlay for the solo game. The backdrop blurs the board so pausing
 * cannot be used to study it with the clock stopped.
 */
export function PauseDialog({ onResume, onQuit }: PauseDialogProps) {
  const { t } = useT();
  const dialogRef = useModalFocus<HTMLDivElement>();
  const resumeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    resumeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onResume();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onResume]);

  return (
    <div className="modal-backdrop" onClick={onResume}>
      <div
        className="screen confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('qol.paused')}
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
      >
        <h2>{t('qol.paused')}</h2>
        <div className="confirm-actions">
          <button type="button" className="text-btn" onClick={onQuit}>
            {t('qol.quit')}
          </button>
          <button type="button" className="primary-btn" onClick={onResume} ref={resumeRef}>
            {t('qol.resume')}
          </button>
        </div>
      </div>
    </div>
  );
}
