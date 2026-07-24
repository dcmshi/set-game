import { detectLang } from './detectLang';

it('detects Chinese from any zh locale', () => {
  expect(detectLang('zh')).toBe('zh');
  expect(detectLang('zh-CN')).toBe('zh');
  expect(detectLang('ZH-TW')).toBe('zh');
});

it('falls back to English otherwise', () => {
  expect(detectLang('en-US')).toBe('en');
  expect(detectLang('')).toBe('en');
  expect(detectLang(undefined)).toBe('en');
});
