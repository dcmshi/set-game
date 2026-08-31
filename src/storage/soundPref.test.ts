import { getSoundEnabled, setStoredSoundEnabled } from './soundPref';

beforeEach(() => localStorage.clear());

it('defaults to off — sound is opt-in', () => {
  expect(getSoundEnabled()).toBe(false);
});

it('stores and reads the preference', () => {
  setStoredSoundEnabled(true);
  expect(getSoundEnabled()).toBe(true);
  setStoredSoundEnabled(false);
  expect(getSoundEnabled()).toBe(false);
});

it('treats a missing or unexpected value as off', () => {
  localStorage.setItem('set-game:sound', 'yes');
  expect(getSoundEnabled()).toBe(false);
});
