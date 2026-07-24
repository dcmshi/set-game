import { getStoredLang, setStoredLang } from './langStorage';

beforeEach(() => localStorage.clear());

it('returns null when nothing stored', () => {
  expect(getStoredLang()).toBeNull();
});

it('round-trips a valid language', () => {
  setStoredLang('zh');
  expect(getStoredLang()).toBe('zh');
});

it('ignores a corrupt stored value', () => {
  localStorage.setItem('set-game:lang', 'fr');
  expect(getStoredLang()).toBeNull();
});
