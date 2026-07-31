import { useEffect, useRef } from 'react';
import { useModalFocus } from './useModalFocus';

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm(): void;
  onCancel(): void;
  danger?: boolean;
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger = true,
}: ConfirmDialogProps) {
  const dialogRef = useModalFocus<HTMLDivElement>();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="screen confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
      >
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="confirm-actions">
          <button type="button" className="text-btn" onClick={onCancel} ref={cancelRef}>
            {cancelLabel}
          </button>
          <button type="button" className={danger ? 'danger-btn' : 'primary-btn'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
