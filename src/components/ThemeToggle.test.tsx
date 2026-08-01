import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';
import { getStoredMode } from '../theme/mode';

function stubMatchMedia(dark: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    matches: dark,
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => void listeners.add(fn),
    removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => void listeners.delete(fn),
  }));
  // The listener sets React state, so the notification has to be flushed.
  return {
    flip: (matches: boolean) =>
      act(() => listeners.forEach((fn) => fn({ matches } as MediaQueryListEvent))),
  };
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  stubMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const toggle = () => screen.getByRole('button', { name: /dark mode/i });

it('starts unpressed on a light system', () => {
  render(<ThemeToggle />);
  expect(toggle()).toHaveAttribute('aria-pressed', 'false');
});

it('pins the theme on the root element when pressed', async () => {
  render(<ThemeToggle />);
  await userEvent.click(toggle());

  expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  expect(document.documentElement.dataset.theme).toBe('dark');
});

it('switches back on a second press', async () => {
  render(<ThemeToggle />);
  await userEvent.click(toggle());
  await userEvent.click(toggle());

  expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  expect(document.documentElement.dataset.theme).toBe('light');
});

it('remembers the choice for the next visit', async () => {
  const { unmount } = render(<ThemeToggle />);
  await userEvent.click(toggle());
  expect(getStoredMode()).toBe('dark');
  unmount();

  render(<ThemeToggle />);
  expect(toggle()).toHaveAttribute('aria-pressed', 'true');
});

// The first press has to flip away from what is on screen, not jump to a fixed
// state — otherwise it appears to do nothing for a player on a dark OS.
it('starts pressed on a dark system, and its first press yields light', async () => {
  stubMatchMedia(true);
  render(<ThemeToggle />);
  expect(toggle()).toHaveAttribute('aria-pressed', 'true');

  await userEvent.click(toggle());
  expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  expect(document.documentElement.dataset.theme).toBe('light');
});

describe('while no choice is stored', () => {
  it('follows a system flip, so the icon cannot go stale', () => {
    const mql = stubMatchMedia(false);
    render(<ThemeToggle />);

    mql.flip(true);
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('stops following once the player has chosen', async () => {
    const mql = stubMatchMedia(false);
    render(<ThemeToggle />);
    await userEvent.click(toggle());

    mql.flip(false);
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
