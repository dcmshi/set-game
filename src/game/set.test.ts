import { generateDeck } from './cards';
import { isSet, findAnySet, boardHasSet } from './set';
import type { Card } from './cards';

const byId = (id: string, deck = generateDeck()): Card => deck.find((c) => c.id === id)!;

it('accepts all-different-everywhere as a Set', () => {
  expect(
    isSet(byId('1-diamond-solid-red'), byId('2-squiggle-striped-green'), byId('3-oval-open-purple'))
  ).toBe(true);
});

it('accepts all-same-except-one-all-different as a Set', () => {
  expect(
    isSet(byId('1-diamond-solid-red'), byId('1-diamond-solid-green'), byId('1-diamond-solid-purple'))
  ).toBe(true);
});

it('rejects two-same-one-different in a feature', () => {
  expect(
    isSet(byId('1-diamond-solid-red'), byId('1-diamond-solid-green'), byId('1-diamond-solid-red'))
  ).toBe(false);
});

it('the full deck contains exactly 1080 Sets', () => {
  const deck = generateDeck();
  let count = 0;
  for (let i = 0; i < deck.length; i++)
    for (let j = i + 1; j < deck.length; j++)
      for (let k = j + 1; k < deck.length; k++)
        if (isSet(deck[i], deck[j], deck[k])) count++;
  expect(count).toBe(1080);
});

it('findAnySet returns a valid Set or null', () => {
  const deck = generateDeck();
  const found = findAnySet(deck.slice(0, 12));
  if (found) expect(isSet(found[0], found[1], found[2])).toBe(true);
  expect(boardHasSet([deck[0]])).toBe(false);
});
