import { cardAriaLabel } from './cardAria';
import type { Card } from '../game/cards';

const c: Card = { id: '2-diamond-striped-red', count: 2, shape: 'diamond', shading: 'striped', color: 'red' };

it('builds English plural/singular labels identical to the legacy format', () => {
  expect(cardAriaLabel(c, 'en')).toBe('2 striped red diamonds');
  expect(cardAriaLabel({ ...c, count: 1 }, 'en')).toBe('1 striped red diamond');
});

it('builds Chinese labels with a measure word and no plural', () => {
  expect(cardAriaLabel(c, 'zh')).toBe('2个红色条纹菱形');
  expect(cardAriaLabel({ ...c, count: 1 }, 'zh')).toBe('1个红色条纹菱形');
});
