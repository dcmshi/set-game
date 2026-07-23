import { renderHook, act } from '@testing-library/react';
import { useGame } from './useGame';
import { findAnySet } from '../game/set';
import { getBestMs } from '../storage/bestTime';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

it('plays a seeded game to a win and records a best time', () => {
  const { result } = renderHook(() => useGame(1));
  act(() => { result.current.start(); });
  expect(result.current.screen).toBe('playing');

  let guard = 0;
  while (result.current.screen === 'playing' && guard++ < 300) {
    const set = findAnySet(result.current.state.board);
    if (!set) break;
    act(() => { set.forEach((c) => result.current.select(c.id)); });
    act(() => { vi.advanceTimersByTime(700); }); // fire the 650ms resolve
  }

  expect(result.current.screen).toBe('won');
  expect(result.current.isRecord).toBe(true);
  expect(getBestMs()).not.toBeNull();
  expect(result.current.displayMs).toBeGreaterThanOrEqual(0);
});
