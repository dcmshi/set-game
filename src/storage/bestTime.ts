const KEY = 'set-game:best-ms';

export function getBestMs(): number | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function setBestMs(ms: number): void {
  try {
    localStorage.setItem(KEY, String(Math.round(ms)));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function recordTime(ms: number): { best: number; isRecord: boolean } {
  const current = getBestMs();
  if (current === null || ms < current) {
    setBestMs(ms);
    return { best: Math.round(ms), isRecord: true };
  }
  return { best: current, isRecord: false };
}
