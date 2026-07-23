import { generateDeck, makeRng, shuffle } from './cards';
import type { Card } from './cards';
import { boardHasSet, isSet } from './set';

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
  let s: GameState = {
    ...state,
    board: state.board.filter((c) => !remove.has(c.id)),
    selected: [],
    pending: null,
    hintedIds: [],
  };
  if (s.board.length < INITIAL_DEAL) s = dealToBoard(s, INITIAL_DEAL);
  s = ensureSetOrDeal(s);
  if (s.deck.length === 0 && !boardHasSet(s.board)) s = { ...s, status: 'won' };
  return s;
}
