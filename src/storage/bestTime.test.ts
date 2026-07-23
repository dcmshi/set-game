import { getBestMs, setBestMs, recordTime } from './bestTime';

beforeEach(() => localStorage.clear());

it('returns null when nothing is stored', () => {
  expect(getBestMs()).toBeNull();
});

it('stores and reads a best time', () => {
  setBestMs(1234);
  expect(getBestMs()).toBe(1234);
});

it('recordTime saves a first result as a record', () => {
  expect(recordTime(5000)).toEqual({ best: 5000, isRecord: true });
  expect(getBestMs()).toBe(5000);
});

it('recordTime only beats a faster time', () => {
  recordTime(5000);
  expect(recordTime(6000)).toEqual({ best: 5000, isRecord: false });
  expect(recordTime(4000)).toEqual({ best: 4000, isRecord: true });
});
