import { formatTime } from '../lib/format';

interface StartScreenProps {
  bestMs: number | null;
  onStart: () => void;
}

export function StartScreen({ bestMs, onStart }: StartScreenProps) {
  return (
    <div className="screen start-screen">
      <h1>Set</h1>
      <p className="tagline">Clear the deck. Beat the clock.</p>
      <ul className="how-to">
        <li>Find 3 cards where each feature is all-same or all-different.</li>
        <li>Wrong pick: +5s. Hint: +15s.</li>
        <li>Empty the whole deck as fast as you can.</li>
      </ul>
      {bestMs !== null && <p className="best">Best time {formatTime(bestMs)}</p>}
      <button type="button" className="primary-btn" onClick={onStart}>
        Start
      </button>
    </div>
  );
}
