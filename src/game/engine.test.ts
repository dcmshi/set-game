import { newGame, INITIAL_DEAL, selectCard, resolve, WRONG_PENALTY_MS, useHint, HINT_PENALTY_MS } from './engine';
import type { GameState } from './engine';
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

it('shrinks a 15-card board back to 12 after a valid Set (no refill)', () => {
  const deck0 = generateDeck();
  const board = deck0.slice(0, 15); // first 15 cards; indices 0,1,2 are a valid Set
  const remainingDeck = deck0.slice(15);
  const state: GameState = {
    deck: remainingDeck, board, selected: [], pending: null, status: 'playing',
    penaltyMs: 0, mistakes: 0, hintsUsed: 0, hintedIds: [],
  };
  const setIds = [board[0].id, board[1].id, board[2].id];
  let s = setIds.reduce((acc, id) => selectCard(acc, id), state);
  expect(s.pending!.valid).toBe(true);
  s = resolve(s);
  expect(s.board.length).toBe(12); // shrank from 15, did NOT refill to 15
  expect(s.deck.length).toBe(remainingDeck.length); // deck untouched, no cards drawn
});

it('replaces a matched Set in place, keeping all other card positions fixed', () => {
  const deck0 = generateDeck();
  const board = deck0.slice(0, 12); // 12 cards; indices 0,1,2 form a valid Set
  const rest = deck0.slice(12); // deck still has cards
  const state: GameState = {
    deck: rest, board, selected: [], pending: null, status: 'playing',
    penaltyMs: 0, mistakes: 0, hintsUsed: 0, hintedIds: [],
  };
  const removed = [board[0].id, board[1].id, board[2].id];
  let s = removed.reduce((acc, id) => selectCard(acc, id), state);
  expect(s.pending!.valid).toBe(true);
  s = resolve(s);

  expect(s.board.length).toBe(12);
  // Untouched cards keep their exact slots.
  for (let i = 3; i < 12; i++) expect(s.board[i].id).toBe(board[i].id);
  // The three cleared slots now hold freshly-dealt cards, not the removed ones.
  for (const i of [0, 1, 2]) {
    expect(removed).not.toContain(s.board[i].id);
    expect(board.map((c) => c.id)).not.toContain(s.board[i].id);
  }
});

it('hint highlights a valid Set and costs time', () => {
  const s0 = newGame(9);
  const s = useHint(s0);
  expect(s.hintedIds).toHaveLength(3);
  expect(s.penaltyMs).toBe(HINT_PENALTY_MS);
  expect(s.hintsUsed).toBe(1);
  const cards = s.hintedIds.map((id) => s.board.find((c) => c.id === id)!);
  expect(findAnySet(cards)).not.toBeNull();
});

it('hint highlight persists while selecting and clears when the trio resolves', () => {
  const s0 = newGame(9);
  const hinted = useHint(s0);
  // Clicking the first two hinted cards keeps the highlight in place.
  let s = selectCard(hinted, hinted.hintedIds[0]);
  expect(s.hintedIds).toHaveLength(3);
  s = selectCard(s, hinted.hintedIds[1]);
  expect(s.hintedIds).toHaveLength(3);
  // Completing the trio and resolving it clears the hint.
  s = selectCard(s, hinted.hintedIds[2]);
  expect(s.pending!.valid).toBe(true);
  s = resolve(s);
  expect(s.hintedIds).toEqual([]);
});

it('hint highlight clears when a wrong trio resolves', () => {
  const deck = generateDeck();
  const board = [
    deck.find((c) => c.id === '1-diamond-solid-red')!,
    deck.find((c) => c.id === '1-diamond-solid-green')!,
    deck.find((c) => c.id === '2-diamond-solid-red')!,
  ];
  const state: GameState = {
    deck: [], board, selected: [], pending: null, status: 'playing',
    penaltyMs: 0, mistakes: 0, hintsUsed: 0, hintedIds: [board[0].id, board[1].id, board[2].id],
  };
  let s = board.reduce((acc, c) => selectCard(acc, c.id), state);
  expect(s.pending!.valid).toBe(false);
  expect(s.hintedIds).toHaveLength(3);
  s = resolve(s);
  expect(s.hintedIds).toEqual([]);
});
