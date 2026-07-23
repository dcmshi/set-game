import type { Card } from './cards';

// A feature is valid across three cards when the values are all-same OR
// all-different — exactly what the classic "sum divisible by 3" trick encodes.
function featureOk<T>(a: T, b: T, c: T): boolean {
  const allSame = a === b && b === c;
  const allDiff = a !== b && b !== c && a !== c;
  return allSame || allDiff;
}

export function isSet(a: Card, b: Card, c: Card): boolean {
  return (
    featureOk(a.count, b.count, c.count) &&
    featureOk(a.shape, b.shape, c.shape) &&
    featureOk(a.shading, b.shading, c.shading) &&
    featureOk(a.color, b.color, c.color)
  );
}

export function findAnySet(cards: Card[]): [Card, Card, Card] | null {
  const n = cards.length;
  for (let i = 0; i < n - 2; i++)
    for (let j = i + 1; j < n - 1; j++)
      for (let k = j + 1; k < n; k++)
        if (isSet(cards[i], cards[j], cards[k])) return [cards[i], cards[j], cards[k]];
  return null;
}

export function boardHasSet(cards: Card[]): boolean {
  return findAnySet(cards) !== null;
}
