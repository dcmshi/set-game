export interface TimerState {
  accumulatedMs: number;
  runningSince: number | null; // timestamp of current running segment; null when paused
}

export function startTimer(now: number): TimerState {
  return { accumulatedMs: 0, runningSince: now };
}

export function pauseTimer(t: TimerState, now: number): TimerState {
  if (t.runningSince === null) return t;
  return { accumulatedMs: t.accumulatedMs + (now - t.runningSince), runningSince: null };
}

export function resumeTimer(t: TimerState, now: number): TimerState {
  if (t.runningSince !== null) return t;
  return { ...t, runningSince: now };
}

export function elapsedMs(t: TimerState, now: number): number {
  return t.accumulatedMs + (t.runningSince !== null ? now - t.runningSince : 0);
}
