import { generateDeck, shuffle, makeRng, type Card } from '../../src/game/cards';
import { isSet, boardHasSet } from '../../src/game/set';

export const LOCKOUT_MS = 5000;
export const BOARD_TARGET = 12;
export const DEAL_STEP = 3;
export const MAX_PLAYERS = 12;

export type ClaimResult = { result: 'ok' | 'invalid' | 'taken'; lockoutUntil?: number };

export class MpGame {
  board: Card[] = [];
  startedAt = 0;
  over = false;

  private deck: Card[] = [];
  private scoreMap = new Map<string, number>();
  private lockouts = new Map<string, number>();

  constructor(private now: () => number = () => Date.now()) {}

  get deckCount(): number {
    return this.deck.length;
  }

  get scores(): Record<string, number> {
    return Object.fromEntries(this.scoreMap);
  }

  lockoutFor(id: string): number {
    return this.lockouts.get(id) ?? 0;
  }

  deal(playerIds: string[], seed: number): void {
    this.deck = shuffle(generateDeck(), makeRng(seed));
    this.board = [];
    this.scoreMap = new Map(playerIds.map((id) => [id, 0]));
    this.lockouts = new Map();
    this.over = false;
    this.startedAt = this.now();
    while (this.board.length < BOARD_TARGET && this.deck.length > 0) {
      this.board.push(this.deck.pop()!);
    }
    this.ensureSet();
  }

  claim(playerId: string, cardIds: [string, string, string]): ClaimResult {
    if (this.over) return { result: 'taken' };

    const now = this.now();
    const lock = this.lockouts.get(playerId) ?? 0;
    if (now < lock) return { result: 'invalid', lockoutUntil: lock };

    const distinct = new Set(cardIds).size === 3;
    const cards = cardIds.map((id) => this.board.find((c) => c.id === id));
    const allOnBoard = cards.every((c): c is Card => c !== undefined);

    if (!distinct) return this.lockout(playerId, now);
    if (!allOnBoard) return { result: 'taken' };

    if (!isSet(cards[0]!, cards[1]!, cards[2]!)) {
      return this.lockout(playerId, now);
    }

    // Replace matched cards IN PLACE so every other card keeps its slot (mirrors
    // single-player resolve — otherwise the board appears to reshuffle on a claim).
    const idSet = new Set<string>(cardIds);
    const slots: (Card | null)[] = this.board.slice();
    const removedIdx: number[] = [];
    slots.forEach((c, i) => {
      if (c && idSet.has(c.id)) removedIdx.push(i);
    });

    if (this.board.length > BOARD_TARGET) {
      // Over-dealt (extra cards were added because no Set was present): shrink back
      // toward BOARD_TARGET by pulling donors from the tail, leaving other slots put.
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
      // Normal case: drop a fresh card into each cleared slot in place (or leave it
      // empty to collapse if the deck has run dry near the endgame).
      for (const idx of removedIdx) slots[idx] = this.deck.length > 0 ? this.deck.pop()! : null;
    }

    this.board = slots.filter((c): c is Card => c !== null);
    this.scoreMap.set(playerId, (this.scoreMap.get(playerId) ?? 0) + 1);
    this.ensureSet();
    return { result: 'ok' };
  }

  winnerIds(): string[] {
    const entries = [...this.scoreMap.entries()];
    if (entries.length === 0) return [];
    const top = Math.max(...entries.map(([, s]) => s));
    return entries.filter(([, s]) => s === top).map(([id]) => id);
  }

  /** Ensure a Set exists on the board, dealing DEAL_STEP at a time; mark over if none remain. */
  private ensureSet(): void {
    while (!boardHasSet(this.board) && this.deck.length > 0) {
      for (let i = 0; i < DEAL_STEP && this.deck.length > 0; i++) {
        this.board.push(this.deck.pop()!);
      }
    }
    this.over = this.deck.length === 0 && !boardHasSet(this.board);
  }

  private lockout(playerId: string, now: number): ClaimResult {
    const until = now + LOCKOUT_MS;
    this.lockouts.set(playerId, until);
    return { result: 'invalid', lockoutUntil: until };
  }
}
