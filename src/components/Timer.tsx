import { formatTime } from '../lib/format';

export function Timer({ ms }: { ms: number }) {
  return (
    <div className="timer" role="timer" aria-label="elapsed time">
      {formatTime(ms)}
    </div>
  );
}
