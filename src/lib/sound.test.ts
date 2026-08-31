import { playSelect, playSet, playError, setSoundEnabled } from './sound';

afterEach(() => setSoundEnabled(false));

// jsdom has no AudioContext, so these calls exercise the no-op path: the game
// must never crash just because sound is unavailable.
it('stays silent and harmless without an AudioContext', () => {
  expect(() => {
    playSelect();
    playSet();
    playError();
  }).not.toThrow();
  setSoundEnabled(true);
  expect(() => {
    playSelect();
    playSet();
    playError();
  }).not.toThrow();
});
