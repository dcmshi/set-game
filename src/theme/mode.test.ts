import { applyMode, getEffectiveMode, getStoredMode, isMode, setStoredMode, systemPrefersDark, watchSystemMode } from './mode';

/** jsdom's matchMedia never matches, so the system side has to be stubbed. */
function stubMatchMedia(dark: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    matches: dark,
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => void listeners.add(fn),
    removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => void listeners.delete(fn),
  }));
  return {
    count: () => listeners.size,
    flip: (matches: boolean) => listeners.forEach((fn) => fn({ matches } as MediaQueryListEvent)),
  };
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// "Unset" and "light" have to stay distinguishable: a player on a dark OS who has
// never pressed the button is looking at dark, so the first press must yield light.
it('reports no stored choice until one is made', () => {
  expect(getStoredMode()).toBeNull();
});

it('round-trips a stored choice', () => {
  setStoredMode('dark');
  expect(getStoredMode()).toBe('dark');
  setStoredMode('light');
  expect(getStoredMode()).toBe('light');
});

it('ignores a value it does not recognise', () => {
  localStorage.setItem('set-game:theme', 'sepia');
  expect(getStoredMode()).toBeNull();
});

it('recognises only the modes it ships', () => {
  expect(isMode('light')).toBe(true);
  expect(isMode('dark')).toBe(true);
  expect(isMode('auto')).toBe(false);
  expect(isMode(null)).toBe(false);
});

it('survives storage that throws on access', () => {
  const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied');
  });
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('denied');
  });

  expect(getStoredMode()).toBeNull();
  expect(() => setStoredMode('dark')).not.toThrow();

  getItem.mockRestore();
  setItem.mockRestore();
});

describe('the effective mode', () => {
  it('follows the system while nothing is stored', () => {
    stubMatchMedia(true);
    expect(systemPrefersDark()).toBe(true);
    expect(getEffectiveMode()).toBe('dark');

    stubMatchMedia(false);
    expect(getEffectiveMode()).toBe('light');
  });

  it('prefers a stored choice over the system', () => {
    stubMatchMedia(true);
    setStoredMode('light');
    expect(getEffectiveMode()).toBe('light');
  });

  it('reads as light where matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(systemPrefersDark()).toBe(false);
    expect(getEffectiveMode()).toBe('light');
  });
});

// Theme tokens are light-dark() pairs resolved from color-scheme, so applying a
// mode is one attribute on <html> — and dropping it returns the page to the OS.
it('pins a mode onto the root element and can hand it back', () => {
  applyMode('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
  applyMode('light');
  expect(document.documentElement.dataset.theme).toBe('light');
  applyMode(null);
  expect(document.documentElement.dataset.theme).toBeUndefined();
});

describe('watching the system', () => {
  it('reports a system flip and unsubscribes when released', () => {
    const mql = stubMatchMedia(false);
    const seen: string[] = [];

    const stop = watchSystemMode((mode) => seen.push(mode));
    mql.flip(true);
    mql.flip(false);
    expect(seen).toEqual(['dark', 'light']);

    stop();
    expect(mql.count()).toBe(0);
    mql.flip(true);
    expect(seen).toEqual(['dark', 'light']);
  });

  it('returns a usable release where matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(() => watchSystemMode(() => {})()).not.toThrow();
  });
});
