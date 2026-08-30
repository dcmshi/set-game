import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from './state/useGame';
import { StartScreen } from './components/StartScreen';
import { Board } from './components/Board';
import { Timer } from './components/Timer';
import { Hud } from './components/Hud';
import { WinModal } from './components/WinModal';
import { HowToPlay } from './components/HowToPlay';
import { ConfirmDialog } from './components/ConfirmDialog';
import { LanguageToggle } from './components/LanguageToggle';
import { SetSvgDefs } from './components/SetSvgDefs';
import { PaletteToggle } from './components/PaletteToggle';
import { ThemeToggle } from './components/ThemeToggle';
import { MultiplayerApp } from './components/mp/MultiplayerApp';
import { useT, type I18n } from './i18n/LanguageContext';
import { formatTime } from './lib/format';

const DEEP_LINK = (() => {
  const m = window.location.pathname.match(/^\/r\/([A-Za-z]{4})$/);
  return m ? m[1].toUpperCase() : undefined;
})();
const MP_SERVER_URL = import.meta.env.VITE_MP_SERVER_URL ?? 'ws://localhost:8080';

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
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [mode, setMode] = useState<'single' | 'multi'>(DEEP_LINK ? 'multi' : 'single');
  const message = feedbackMessage(g, t);

  // Flash a "+Ns" chip under the timer whenever the penalty total grows
  // (wrong pick +5s, hint +15s) so the jump in the clock is explained.
  const [penalty, setPenalty] = useState<{ id: number; secs: number } | null>(null);
  const lastPenaltyMs = useRef(0);
  useEffect(() => {
    const total = g.state.penaltyMs;
    if (total > lastPenaltyMs.current) {
      setPenalty({ id: total, secs: (total - lastPenaltyMs.current) / 1000 });
    }
    lastPenaltyMs.current = total;
  }, [g.state.penaltyMs]);

  // Toast when the engine deals extra cards because the board holds no Set —
  // otherwise the board just grows by three with no explanation.
  const [dealNotice, setDealNotice] = useState(0);
  const lastExtraDeals = useRef(0);
  useEffect(() => {
    const n = g.state.extraDeals;
    if (n > lastExtraDeals.current) setDealNotice(n);
    lastExtraDeals.current = n;
  }, [g.state.extraDeals]);

  // Keyboard: H asks for a hint (arrows + Enter already cover the cards).
  const hint = g.hint;
  useEffect(() => {
    if (g.screen !== 'playing' || howToOpen || confirmQuit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'h' || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest('input, select, textarea')) return;
      hint();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [g.screen, hint, howToOpen, confirmQuit]);

  const openHowTo = useCallback(() => {
    g.pause();
    setHowToOpen(true);
  }, [g]);
  const closeHowTo = useCallback(() => {
    setHowToOpen(false);
    g.resume();
  }, [g]);

  // Mirror the current screen onto <html> so the static #site-content section in
  // index.html (which React does not own) can hide itself while a game is on.
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.appScreen = mode === 'multi' ? 'multi' : g.screen;
    return () => {
      delete el.dataset.appScreen;
    };
  }, [mode, g.screen]);

  // All hooks are declared above this point; safe to branch on mode now.
  // SetSvgDefs lives here rather than in each board/modal so the #stripes-*
  // pattern ids stay unique no matter what is on screen.
  if (mode === 'multi') {
    return (
      <div className="app">
        <SetSvgDefs />
        <MultiplayerApp serverUrl={MP_SERVER_URL} initialCode={DEEP_LINK} onExit={() => setMode('single')} />
      </div>
    );
  }

  return (
    <div className="app">
      <SetSvgDefs />
      <div className="sr-only" role="status" aria-live="polite">
        {message}
      </div>

      {g.screen === 'start' && (
        <StartScreen
          bestMs={g.bestMs}
          onStart={g.start}
          onHowToPlay={openHowTo}
          onMultiplayer={() => setMode('multi')}
        />
      )}

      {g.screen === 'playing' && (
        <div className="game">
          <header className="topbar">
            <Timer ms={g.displayMs} />
            {penalty && (
              <span
                key={penalty.id}
                className="penalty-chip"
                aria-hidden="true"
                onAnimationEnd={() => setPenalty(null)}
              >
                +{penalty.secs}s
              </span>
            )}
            <div className="topbar-actions">
              <button type="button" className="quit-btn" onClick={() => setConfirmQuit(true)}>
                {t('qol.quit')}
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('topbar.howToAria')}
                onClick={openHowTo}
              >
                ?
              </button>
              <ThemeToggle />
              <PaletteToggle />
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
          {dealNotice > 0 && (
            <p
              key={dealNotice}
              className="deal-toast"
              role="status"
              onAnimationEnd={() => setDealNotice(0)}
            >
              {t('game.dealtExtra')}
            </p>
          )}
        </div>
      )}

      {g.screen === 'won' && (
        <WinModal
          timeMs={g.displayMs}
          bestMs={g.bestMs ?? g.displayMs}
          isRecord={g.isRecord}
          previousBestMs={g.previousBestMs}
          mistakes={g.state.mistakes}
          hintsUsed={g.state.hintsUsed}
          onPlayAgain={g.start}
        />
      )}

      {howToOpen && <HowToPlay onClose={closeHowTo} />}

      {confirmQuit && (
        <ConfirmDialog
          title={t('qol.quitTitle')}
          body={t('qol.quitBodySingle')}
          confirmLabel={t('qol.quit')}
          cancelLabel={t('qol.keepPlaying')}
          onConfirm={() => {
            setConfirmQuit(false);
            g.quit();
          }}
          onCancel={() => setConfirmQuit(false)}
        />
      )}
    </div>
  );
}
