import { formatTime } from '../lib/format';
import { useT } from '../i18n/LanguageContext';

export function Timer({ ms }: { ms: number }) {
  const { t } = useT();
  return (
    <div className="timer" role="timer" aria-label={t('timer.aria')}>
      {formatTime(ms)}
    </div>
  );
}
