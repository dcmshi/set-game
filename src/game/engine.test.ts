import { newGame, INITIAL_DEAL } from './engine';
import { boardHasSet } from './set';

it('deals a starting board that always contains a Set', () => {
  for (let seed = 0; seed < 40; seed++) {
    const s = newGame(seed);
    expect(s.status).toBe('playing');
    expect(boardHasSet(s.board)).toBe(true);
    expect(s.board.length).toBeGreaterThanOrEqual(INITIAL_DEAL);
    expect(s.board.length).toBeLessThanOrEqual(21);
    expect(s.board.length % 3).toBe(0);
    expect(s.deck.length + s.board.length).toBe(81);
  }
});

it('starts with empty selection and zeroed counters', () => {
  const s = newGame(1);
  expect(s.selected).toEqual([]);
  expect(s.pending).toBeNull();
  expect(s.penaltyMs).toBe(0);
  expect(s.mistakes).toBe(0);
  expect(s.hintsUsed).toBe(0);
  expect(s.hintedIds).toEqual([]);
});
