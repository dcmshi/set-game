import { renderHook, act } from '@testing-library/react';
import { useGame } from './useGame';
import * as timer from './timer';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('exposes paused state that pause/resume toggle, reset by start', () => {
  const { result } = renderHook(() => useGame(1));
  expect(result.current.paused).toBe(false);

  act(() => { result.current.pause(); });
  expect(result.current.paused).toBe(true);

  act(() => { result.current.resume(); });
  expect(result.current.paused).toBe(false);

  act(() => { result.current.pause(); });
  act(() => { result.current.start(); });
  expect(result.current.paused).toBe(false);
});

it('pauses and resumes the running clock while playing', () => {
  const pauseSpy = vi.spyOn(timer, 'pauseTimer');
  const resumeSpy = vi.spyOn(timer, 'resumeTimer');
  const { result } = renderHook(() => useGame(1));

  act(() => { result.current.start(); });
  pauseSpy.mockClear();
  resumeSpy.mockClear();

  act(() => { result.current.pause(); });
  expect(pauseSpy).toHaveBeenCalled();

  act(() => { result.current.resume(); });
  expect(resumeSpy).toHaveBeenCalled();
});
