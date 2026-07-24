import { useCallback, useState } from 'react';
import { useGame } from './state/useGame';
import { StartScreen } from './components/StartScreen';
import { Board } from './components/Board';
import { Timer } from './components/Timer';
import { Hud } from './components/Hud';
import { WinModal } from './components/WinModal';
import { HowToPlay } from './components/HowToPlay';
import { LanguageToggle } from './components/LanguageToggle';
import { useT, type I18n } from './i18n/LanguageContext';
import { formatTime } from './lib/format';

function feedbackMessage(g: ReturnType<typeof useGame>, t: I18n['t']): string {
  if (g.screen === 'won') return t('feedback.won', { time: formatTime(g.displayMs) });
  if (g.state.pending) return g.state.pending.valid ? t('feedback.setFound') : t('feedback.notSet');
  if (g.state.hintedIds.length > 0) return t('feedback.hint');
  return '';
}

export default function App({ seed }: { seed?: number }) {
  const g = useGame(seed);
  const { t } = useT();
  const [howToOpen, setHowToOpen] = useState(false);
  const message = feedbackMessage(g, t);

  const openHowTo = useCallback(() => {
    g.pause();
    setHowToOpen(true);
  }, [g]);
  const closeHowTo = useCallback(() => {
    setHowToOpen(false);
    g.resume();
  }, [g]);

  return (
    <div className="app">
      <div className="sr-only" role="status" aria-live="polite">
        {message}
      </div>

      {g.screen === 'start' && (
        <StartScreen bestMs={g.bestMs} onStart={g.start} onHowToPlay={openHowTo} />
      )}

      {g.screen === 'playing' && (
        <div className="game">
          <header className="topbar">
            <Timer ms={g.displayMs} />
            <div className="topbar-actions">
              <button
                type="button"
                className="icon-btn"
                aria-label={t('topbar.howToAria')}
                onClick={openHowTo}
              >
                ?
              </button>
              <LanguageToggle />
            </div>
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

      {howToOpen && <HowToPlay onClose={closeHowTo} />}
    </div>
  );
}
