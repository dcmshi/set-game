import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { gameReducer } from './gameReducer';
import { newGame } from '../game/engine';
import type { GameState } from '../game/engine';
import { startTimer, pauseTimer, resumeTimer, elapsedMs, type TimerState } from './timer';
import { getBestMs, recordTime } from '../storage/bestTime';

const RESOLVE_DELAY_MS = 650;

export type Screen = 'start' | 'playing' | 'won';

export interface UseGame {
  screen: Screen;
  state: GameState;
  displayMs: number;
  bestMs: number | null;
  isRecord: boolean;
  start: () => void;
  select: (id: string) => void;
  hint: () => void;
  paused: boolean;
  pause: () => void;
  resume: () => void;
}

export function useGame(seed?: number): UseGame {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => newGame(seed));
  const [screen, setScreen] = useState<Screen>('start');
  const [bestMs, setBestMs] = useState<number | null>(() => getBestMs());
  const [isRecord, setIsRecord] = useState(false);
  const [displayMs, setDisplayMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);

  const timerRef = useRef<TimerState>({ accumulatedMs: 0, runningSince: null });
  const penaltyRef = useRef(0);
  penaltyRef.current = state.penaltyMs;

  // Display tick while playing.
  useEffect(() => {
    if (screen !== 'playing') return;
    let raf = 0;
    let active = true;
    const tick = () => {
      if (!active) return;
      setDisplayMs(elapsedMs(timerRef.current, performance.now()) + penaltyRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [screen]);

  // Track tab visibility as state (a single source of truth drives the clock).
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // The clock runs only while playing, not paused (tutorial), and not hidden.
  useEffect(() => {
    if (screen !== 'playing') return;
    const now = performance.now();
    timerRef.current =
      paused || hidden ? pauseTimer(timerRef.current, now) : resumeTimer(timerRef.current, now);
  }, [screen, paused, hidden]);

  // Resolve a pending selection after a short flash.
  useEffect(() => {
    if (!state.pending) return;
    const t = setTimeout(() => dispatch({ type: 'RESOLVE' }), RESOLVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [state.pending]);

  // Handle a win: stop the clock, record the time, switch screens.
  useEffect(() => {
    if (state.status !== 'won' || screen !== 'playing') return;
    timerRef.current = pauseTimer(timerRef.current, performance.now());
    const finalMs = elapsedMs(timerRef.current, performance.now()) + state.penaltyMs;
    const result = recordTime(finalMs);
    setBestMs(result.best);
    setIsRecord(result.isRecord);
    setDisplayMs(finalMs);
    setScreen('won');
  }, [state.status, screen, state.penaltyMs]);

  const start = useCallback(() => {
    dispatch({ type: 'START', seed });
    timerRef.current = startTimer(performance.now());
    setIsRecord(false);
    setDisplayMs(0);
    setPaused(false);
    setScreen('playing');
  }, [seed]);

  const select = useCallback((id: string) => dispatch({ type: 'SELECT', id }), []);
  const hint = useCallback(() => dispatch({ type: 'HINT' }), []);
  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  return { screen, state, displayMs, bestMs, isRecord, start, select, hint, paused, pause, resume };
}
