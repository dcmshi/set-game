import { generateDeck, makeRng, shuffle } from './cards';
import type { Card } from './cards';
import { boardHasSet, isSet, findAnySet } from './set';

export const WRONG_PENALTY_MS = 5000;
export const HINT_PENALTY_MS = 15000;
export const INITIAL_DEAL = 12;
export const DEAL_INCREMENT = 3;

export type GameStatus = 'playing' | 'won';

export interface PendingResult {
  valid: boolean;
  ids: string[];
}

export interface GameState {
  deck: Card[];
  board: Card[];
  selected: string[];
  pending: PendingResult | null;
  status: GameStatus;
  penaltyMs: number;
  mistakes: number;
  hintsUsed: number;
  hintedIds: string[];
}

// Move cards from deck to board until board reaches `target` (or deck empties).
function dealToBoard(state: GameState, target: number): GameState {
  const board = state.board.slice();
  const deck = state.deck.slice();
  while (board.length < target && deck.length > 0) board.push(deck.shift()!);
  return { ...state, board, deck };
}

// Guarantee a Set exists on the board, dealing 3 at a time while possible.
function ensureSetOrDeal(state: GameState): GameState {
  let s = state;
  while (!boardHasSet(s.board) && s.deck.length > 0) {
    s = dealToBoard(s, s.board.length + DEAL_INCREMENT);
  }
  return s;
}

export function newGame(seed: number = Date.now()): GameState {
  const deck = shuffle(generateDeck(), makeRng(seed));
  let state: GameState = {
    deck,
    board: [],
    selected: [],
    pending: null,
    status: 'playing',
    penaltyMs: 0,
    mistakes: 0,
    hintsUsed: 0,
    hintedIds: [],
  };
  state = dealToBoard(state, INITIAL_DEAL);
  state = ensureSetOrDeal(state);
  return state;
}

// dealToBoard and ensureSetOrDeal are reused by Task 5; keep them in this file.

export function selectCard(state: GameState, id: string): GameState {
  if (state.status !== 'playing' || state.pending) return state;
  if (!state.board.some((c) => c.id === id)) return state;

  const selected = state.selected.includes(id)
    ? state.selected.filter((x) => x !== id)
    : [...state.selected, id];

  const next: GameState = { ...state, selected, hintedIds: [] };
  if (selected.length < 3) return next;

  const [a, b, c] = selected.map((sid) => next.board.find((x) => x.id === sid)!);
  return { ...next, pending: { valid: isSet(a, b, c), ids: selected } };
}

export function resolve(state: GameState): GameState {
  if (!state.pending) return state;
  const { valid, ids } = state.pending;

  if (!valid) {
    return {
      ...state,
      selected: [],
      pending: null,
      penaltyMs: state.penaltyMs + WRONG_PENALTY_MS,
      mistakes: state.mistakes + 1,
    };
  }

  const remove = new Set(ids);
  const slots: (Card | null)[] = state.board.slice();
  const removedIdx = slots.reduce<number[]>((acc, c, i) => {
    if (remove.has(c!.id)) acc.push(i);
    return acc;
  }, []);
  const deck = state.deck.slice();

  if (state.board.length > INITIAL_DEAL) {
    // Board was over-dealt (extra cards were added because no Set was present).
    // Shrink back toward 12 by filling each cleared slot with a card pulled from
    // the tail, so every other card keeps its position and no new cards are dealt.
    for (const idx of removedIdx) slots[idx] = null;
    let donor = slots.length - 1;
    for (const idx of removedIdx) {
      while (donor > idx && slots[donor] === null) donor--;
      if (donor > idx) {
        slots[idx] = slots[donor];
        slots[donor] = null;
        donor--;
      }
    }
  } else {
    // Normal case: drop a fresh card into each cleared slot in place, so only the
    // matched cards' positions change. If the deck runs dry (endgame), the slot
    // is left empty and collapses.
    for (const idx of removedIdx) slots[idx] = deck.length > 0 ? deck.shift()! : null;
  }

  let s: GameState = {
    ...state,
    board: slots.filter((c): c is Card => c !== null),
    deck,
    selected: [],
    pending: null,
    hintedIds: [],
  };
  s = ensureSetOrDeal(s);
  if (s.deck.length === 0 && !boardHasSet(s.board)) s = { ...s, status: 'won' };
  return s;
}

export function useHint(state: GameState): GameState {
  if (state.status !== 'playing' || state.pending) return state;
  const found = findAnySet(state.board);
  if (!found) return state;
  return {
    ...state,
    hintedIds: found.map((c) => c.id),
    penaltyMs: state.penaltyMs + HINT_PENALTY_MS,
    hintsUsed: state.hintsUsed + 1,
  };
}
