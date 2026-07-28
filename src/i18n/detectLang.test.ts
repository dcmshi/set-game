import { detectLang, isLang, LANGS } from './detectLang';

it('lists every supported language', () => {
  expect([...LANGS]).toEqual(['en', 'zh', 'fr', 'es', 'ja']);
});

it('detects a language from any regional variant of its locale', () => {
  expect(detectLang('zh')).toBe('zh');
  expect(detectLang('zh-CN')).toBe('zh');
  expect(detectLang('ZH-TW')).toBe('zh');
  expect(detectLang('fr-CA')).toBe('fr');
  expect(detectLang('es-419')).toBe('es');
  expect(detectLang('ja-JP')).toBe('ja');
});

it('falls back to English otherwise', () => {
  expect(detectLang('en-US')).toBe('en');
  expect(detectLang('de-DE')).toBe('en');
  expect(detectLang('')).toBe('en');
  expect(detectLang(undefined)).toBe('en');
});

it('narrows unknown values with isLang', () => {
  expect(isLang('ja')).toBe(true);
  expect(isLang('de')).toBe(false);
  expect(isLang(null)).toBe(false);
});
