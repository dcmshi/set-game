import { formatTime } from './format';

it('formats milliseconds as m:ss.d', () => {
  expect(formatTime(0)).toBe('0:00.0');
  expect(formatTime(5000)).toBe('0:05.0');
  expect(formatTime(65400)).toBe('1:05.4');
  expect(formatTime(600000)).toBe('10:00.0');
});
