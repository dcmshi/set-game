import { newGame, INITIAL_DEAL, selectCard, resolve, WRONG_PENALTY_MS } from './engine';
import type { GameState, Card } from './engine';
import { boardHasSet, findAnySet } from './set';
import { generateDeck } from './cards';

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

function play(seed: number) {
  return newGame(seed);
}

it('toggles selection and flags a valid Set as pending', () => {
  const s0 = play(3);
  const set = findAnySet(s0.board)!;
  let s = selectCard(s0, set[0].id);
  s = selectCard(s, set[1].id);
  expect(s.selected).toHaveLength(2);
  expect(s.pending).toBeNull();
  s = selectCard(s, set[2].id);
  expect(s.pending).toEqual({ valid: true, ids: [set[0].id, set[1].id, set[2].id] });
});

it('deselects a re-clicked card', () => {
  const s0 = play(3);
  const id = s0.board[0].id;
  let s = selectCard(s0, id);
  expect(s.selected).toEqual([id]);
  s = selectCard(s, id);
  expect(s.selected).toEqual([]);
});

it('resolving a valid Set removes the 3 cards and refills toward 12', () => {
  const s0 = play(3);
  const set = findAnySet(s0.board)!;
  const ids = set.map((c) => c.id);
  let s = ids.reduce((acc, id) => selectCard(acc, id), s0);
  s = resolve(s);
  for (const id of ids) expect(s.board.some((c) => c.id === id)).toBe(false);
  expect(s.selected).toEqual([]);
  expect(s.pending).toBeNull();
  expect(s.board.length).toBeGreaterThanOrEqual(12); // deck still has plenty early on
});

it('resolving an invalid pick adds a penalty and a mistake', () => {
  // Three genuinely different cards that do NOT form a Set.
  const deck = generateDeck();
  const board = [
    deck.find((c) => c.id === '1-diamond-solid-red')!,
    deck.find((c) => c.id === '1-diamond-solid-green')!,
    deck.find((c) => c.id === '2-diamond-solid-red')!,
  ];
  const state: GameState = {
    deck: [], board, selected: [], pending: null, status: 'playing',
    penaltyMs: 0, mistakes: 0, hintsUsed: 0, hintedIds: [],
  };
  let s = board.reduce((acc, c) => selectCard(acc, c.id), state);
  expect(s.pending!.valid).toBe(false);
  s = resolve(s);
  expect(s.penaltyMs).toBe(WRONG_PENALTY_MS);
  expect(s.mistakes).toBe(1);
  expect(s.selected).toEqual([]);
});

it('wins when the last Set clears an empty deck', () => {
  const deck = generateDeck();
  const set = [
    deck.find((c) => c.id === '1-diamond-solid-red')!,
    deck.find((c) => c.id === '2-diamond-solid-red')!,
    deck.find((c) => c.id === '3-diamond-solid-red')!,
  ];
  const state: GameState = {
    deck: [], board: [...set], selected: [], pending: null, status: 'playing',
    penaltyMs: 0, mistakes: 0, hintsUsed: 0, hintedIds: [],
  };
  let s = set.reduce((acc, c) => selectCard(acc, c.id), state);
  s = resolve(s);
  expect(s.board).toEqual([]);
  expect(s.status).toBe('won');
});
