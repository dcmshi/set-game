import { applyPalette, getStoredPalette, isPalette, setStoredPalette } from './palette';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.palette;
});

it('defaults to the classic palette when nothing is stored', () => {
  expect(getStoredPalette()).toBe('classic');
});

it('round-trips a stored choice', () => {
  setStoredPalette('colorblind');
  expect(getStoredPalette()).toBe('colorblind');
  setStoredPalette('classic');
  expect(getStoredPalette()).toBe('classic');
});

it('falls back to classic for a value it does not recognise', () => {
  localStorage.setItem('set-game:palette', 'chartreuse');
  expect(getStoredPalette()).toBe('classic');
});

it('recognises only the palettes it ships', () => {
  expect(isPalette('classic')).toBe(true);
  expect(isPalette('colorblind')).toBe(true);
  expect(isPalette('deuteranopia')).toBe(false);
  expect(isPalette(null)).toBe(false);
});

// Suit colours live in CSS, so applying a palette is one attribute on <html>.
it('applies a palette onto the root element', () => {
  applyPalette('colorblind');
  expect(document.documentElement.dataset.palette).toBe('colorblind');
  applyPalette('classic');
  expect(document.documentElement.dataset.palette).toBe('classic');
});
