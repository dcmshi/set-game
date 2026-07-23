export type Count = 1 | 2 | 3;
export type Shape = 'diamond' | 'squiggle' | 'oval';
export type Shading = 'solid' | 'striped' | 'open';
export type Color = 'red' | 'green' | 'purple';

export interface Card {
  id: string;
  count: Count;
  shape: Shape;
  shading: Shading;
  color: Color;
}

export const COUNTS: readonly Count[] = [1, 2, 3];
export const SHAPES: readonly Shape[] = ['diamond', 'squiggle', 'oval'];
export const SHADINGS: readonly Shading[] = ['solid', 'striped', 'open'];
export const COLORS: readonly Color[] = ['red', 'green', 'purple'];

export function cardId(c: Omit<Card, 'id'>): string {
  return `${c.count}-${c.shape}-${c.shading}-${c.color}`;
}

export function generateDeck(): Card[] {
  const deck: Card[] = [];
  for (const count of COUNTS)
    for (const shape of SHAPES)
      for (const shading of SHADINGS)
        for (const color of COLORS) {
          const partial = { count, shape, shading, color };
          deck.push({ id: cardId(partial), ...partial });
        }
  return deck;
}

// Deterministic, seedable RNG (mulberry32) so shuffles are reproducible in tests.
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
