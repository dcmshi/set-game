const KEY = 'set-game:sound';

/** Opt-in: false until the player explicitly turns sound on. */
export function getSoundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setStoredSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage unavailable — ignore */
  }
}
