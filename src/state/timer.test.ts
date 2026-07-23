import { startTimer, pauseTimer, resumeTimer, elapsedMs } from './timer';

it('counts wall-clock time while running', () => {
  const t = startTimer(1000);
  expect(elapsedMs(t, 1000)).toBe(0);
  expect(elapsedMs(t, 3500)).toBe(2500);
});

it('freezes while paused and resumes without double-counting', () => {
  let t = startTimer(0);
  t = pauseTimer(t, 2000); // 2s counted
  expect(elapsedMs(t, 9999)).toBe(2000); // hidden tab: no growth
  t = resumeTimer(t, 5000);
  expect(elapsedMs(t, 6000)).toBe(3000); // 2000 + 1000
});

it('pause and resume are idempotent', () => {
  let t = startTimer(0);
  t = pauseTimer(t, 1000);
  t = pauseTimer(t, 5000); // second pause is a no-op
  expect(elapsedMs(t, 9000)).toBe(1000);
  t = resumeTimer(t, 6000);
  t = resumeTimer(t, 7000); // second resume is a no-op
  expect(elapsedMs(t, 8000)).toBe(1000 + 2000);
});
