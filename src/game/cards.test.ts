import { generateDeck, makeRng, shuffle, COUNTS, SHAPES, SHADINGS, COLORS } from './cards';

it('generates all 81 unique cards', () => {
  const deck = generateDeck();
  expect(deck).toHaveLength(81);
  expect(new Set(deck.map((c) => c.id)).size).toBe(81);
});

it('covers every feature value', () => {
  const deck = generateDeck();
  for (const count of COUNTS) expect(deck.some((c) => c.count === count)).toBe(true);
  for (const shape of SHAPES) expect(deck.some((c) => c.shape === shape)).toBe(true);
  for (const shading of SHADINGS) expect(deck.some((c) => c.shading === shading)).toBe(true);
  for (const color of COLORS) expect(deck.some((c) => c.color === color)).toBe(true);
});

it('shuffle is deterministic per seed and preserves the multiset', () => {
  const deck = generateDeck();
  const a = shuffle(deck, makeRng(42));
  const b = shuffle(deck, makeRng(42));
  expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  expect(new Set(a.map((c) => c.id)).size).toBe(81);
  expect(a.map((c) => c.id)).not.toEqual(deck.map((c) => c.id)); // actually shuffled
});
