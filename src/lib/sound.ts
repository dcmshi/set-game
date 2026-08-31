// Tiny WebAudio blips — no assets, no dependencies. Sound is opt-in via the
// top-bar toggle; every play* call is a no-op until setSoundEnabled(true).

let enabled = false;
let ctx: AudioContext | null = null;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  // Creating/resuming the context here means it happens inside the toggle's
  // click handler — a user gesture, so autoplay policies allow it.
  if (on) void audio()?.resume();
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

interface BlipOptions {
  delay?: number;
  type?: OscillatorType;
  volume?: number;
}

function blip(freq: number, durationSecs: number, { delay = 0, type = 'sine', volume = 0.06 }: BlipOptions = {}): void {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  // Short attack, exponential decay — a chirp, not a beep that clicks.
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSecs);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durationSecs + 0.02);
}

/** Card picked. */
export function playSelect(): void {
  blip(660, 0.07);
}

/** Set found — a rising two-note chime. */
export function playSet(): void {
  blip(523, 0.09);
  blip(784, 0.14, { delay: 0.08 });
}

/** Wrong trio — a low buzz. */
export function playError(): void {
  blip(160, 0.2, { type: 'square', volume: 0.04 });
}
