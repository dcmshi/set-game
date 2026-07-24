import { strings } from './strings';

it('en and zh expose the identical set of keys', () => {
  const en = Object.keys(strings.en).sort();
  const zh = Object.keys(strings.zh).sort();
  expect(zh).toEqual(en);
});

it('has no empty string values', () => {
  for (const lang of ['en', 'zh'] as const) {
    for (const [k, v] of Object.entries(strings[lang])) {
      expect(v, `${lang}.${k}`).not.toBe('');
    }
  }
});
