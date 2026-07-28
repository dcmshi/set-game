import { getStoredLang, setStoredLang } from './langStorage';
import { LANGS } from './detectLang';

beforeEach(() => localStorage.clear());

it('returns null when nothing stored', () => {
  expect(getStoredLang()).toBeNull();
});

it('round-trips every supported language', () => {
  for (const lang of LANGS) {
    setStoredLang(lang);
    expect(getStoredLang()).toBe(lang);
  }
});

it('ignores a corrupt stored value', () => {
  localStorage.setItem('set-game:lang', 'de');
  expect(getStoredLang()).toBeNull();
});
