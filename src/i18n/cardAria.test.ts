import { cardAriaLabel } from './cardAria';
import type { Card } from '../game/cards';

const c: Card = { id: '2-diamond-striped-red', count: 2, shape: 'diamond', shading: 'striped', color: 'red' };
const card = (over: Partial<Card>): Card => ({ ...c, ...over });

it('builds English plural/singular labels identical to the legacy format', () => {
  expect(cardAriaLabel(c, 'en')).toBe('2 striped red diamonds');
  expect(cardAriaLabel({ ...c, count: 1 }, 'en')).toBe('1 striped red diamond');
});

it('builds Chinese labels with a measure word and no plural', () => {
  expect(cardAriaLabel(c, 'zh')).toBe('2个红色条纹菱形');
  expect(cardAriaLabel({ ...c, count: 1 }, 'zh')).toBe('1个红色条纹菱形');
});

// French adjectives agree with the gender of the shape noun: losange and ovale
// are masculine, vague is feminine.
it('agrees French adjectives with the gender and number of the shape', () => {
  expect(cardAriaLabel(c, 'fr')).toBe('2 losanges rouges hachurés');
  expect(cardAriaLabel(card({ count: 1 }), 'fr')).toBe('1 losange rouge hachuré');
  expect(cardAriaLabel(card({ count: 1, shape: 'squiggle' }), 'fr')).toBe('1 vague rouge hachurée');
  expect(cardAriaLabel(card({ count: 3, shape: 'squiggle', shading: 'open', color: 'green' }), 'fr')).toBe(
    '3 vagues vertes vides'
  );
  expect(cardAriaLabel(card({ shape: 'oval', shading: 'solid', color: 'purple' }), 'fr')).toBe(
    '2 ovales violets pleins'
  );
  expect(cardAriaLabel(card({ count: 1, shape: 'squiggle', shading: 'solid', color: 'purple' }), 'fr')).toBe(
    '1 vague violette pleine'
  );
});

// Every Spanish shape noun is masculine, so agreement collapses to a plain -s.
it('pluralises Spanish with a trailing -s', () => {
  expect(cardAriaLabel(c, 'es')).toBe('2 rombos rojos rayados');
  expect(cardAriaLabel(card({ count: 1 }), 'es')).toBe('1 rombo rojo rayado');
  expect(cardAriaLabel(card({ count: 3, shape: 'oval', shading: 'open', color: 'green' }), 'es')).toBe(
    '3 óvalos verdes vacíos'
  );
  expect(cardAriaLabel(card({ shape: 'squiggle', shading: 'solid', color: 'purple' }), 'es')).toBe(
    '2 garabatos morados sólidos'
  );
});

it('builds Japanese labels with a counter and no plural', () => {
  expect(cardAriaLabel(c, 'ja')).toBe('2個の赤の縞模様のひし形');
  expect(cardAriaLabel(card({ count: 1 }), 'ja')).toBe('1個の赤の縞模様のひし形');
  expect(cardAriaLabel(card({ count: 3, shape: 'oval', shading: 'open', color: 'green' }), 'ja')).toBe(
    '3個の緑の白抜きの楕円'
  );
});
