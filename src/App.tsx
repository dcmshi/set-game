import { useGame } from './state/useGame';
import { StartScreen } from './components/StartScreen';
import { Board } from './components/Board';
import { Timer } from './components/Timer';
import { Hud } from './components/Hud';
import { WinModal } from './components/WinModal';
import { formatTime } from './lib/format';

function feedbackMessage(g: ReturnType<typeof useGame>): string {
  if (g.screen === 'won') return `Deck cleared! Final time ${formatTime(g.displayMs)}.`;
  if (g.state.pending) return g.state.pending.valid ? 'Set found!' : 'Not a Set. Five second penalty.';
  if (g.state.hintedIds.length > 0) return 'Hint shown.';
  return '';
}

export default function App({ seed }: { seed?: number }) {
  const g = useGame(seed);
  const message = feedbackMessage(g);

  return (
    <div className="app">
      <div className="sr-only" role="status" aria-live="polite">
        {message}
      </div>

      {g.screen === 'start' && <StartScreen bestMs={g.bestMs} onStart={g.start} />}

      {g.screen === 'playing' && (
        <div className="game">
          <header className="topbar">
            <Timer ms={g.displayMs} />
          </header>
          <Board state={g.state} onSelect={g.select} />
          <Hud
            deckCount={g.state.deck.length}
            mistakes={g.state.mistakes}
            onHint={g.hint}
            hintDisabled={g.state.pending !== null}
          />
        </div>
      )}

      {g.screen === 'won' && (
        <WinModal
          timeMs={g.displayMs}
          bestMs={g.bestMs ?? g.displayMs}
          isRecord={g.isRecord}
          onPlayAgain={g.start}
        />
      )}
    </div>
  );
}
