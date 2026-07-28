import { strings } from './strings';
import { LANGS } from './detectLang';

const enKeys = Object.keys(strings.en).sort();

it('ships a table for every supported language', () => {
  expect(Object.keys(strings).sort()).toEqual([...LANGS].sort());
});

it('gives every language the identical set of keys', () => {
  for (const lang of LANGS) {
    expect(Object.keys(strings[lang]).sort(), lang).toEqual(enKeys);
  }
});

it('has no empty string values', () => {
  for (const lang of LANGS) {
    for (const [k, v] of Object.entries(strings[lang])) {
      expect(v, `${lang}.${k}`).not.toBe('');
    }
  }
});

// Every {placeholder} in the English source must survive translation, or the
// value silently renders as literal braces to the user.
it('preserves the placeholders of the English source', () => {
  for (const key of enKeys as (keyof typeof strings.en)[]) {
    const expected = [...strings.en[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const lang of LANGS) {
      const actual = [...strings[lang][key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      expect(actual, `${lang}.${key}`).toEqual(expected);
    }
  }
});

// A key left untranslated silently renders English, and only in the corner of
// the UI nobody thought to check. Requiring a distinct value is the cheap proxy
// for "someone actually translated this" — with an explicit allowlist for the
// handful of words that genuinely coincide with English.
const SAME_AS_ENGLISH: Partial<Record<(typeof LANGS)[number], string[]>> = {
  es: ['howto.feature.color'],
};

it('does not leave non-English tables as copies of English', () => {
  for (const lang of LANGS.filter((l) => l !== 'en')) {
    const allowed = SAME_AS_ENGLISH[lang] ?? [];
    const copied = (enKeys as (keyof typeof strings.en)[]).filter(
      (k) => strings[lang][k] === strings.en[k] && !allowed.includes(k)
    );
    expect(copied, `${lang} keys identical to English`).toEqual([]);
  }
});
