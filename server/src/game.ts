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
    this.refill();
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

    this.board = this.board.filter((c) => !cardIds.includes(c.id));
    this.scoreMap.set(playerId, (this.scoreMap.get(playerId) ?? 0) + 1);
    this.refill();
    return { result: 'ok' };
  }

  winnerIds(): string[] {
    const entries = [...this.scoreMap.entries()];
    if (entries.length === 0) return [];
    const top = Math.max(...entries.map(([, s]) => s));
    return entries.filter(([, s]) => s === top).map(([id]) => id);
  }

  /** Fill toward BOARD_TARGET, then ensure a Set exists (dealing DEAL_STEP at a time). */
  private refill(): void {
    while (this.board.length < BOARD_TARGET && this.deck.length > 0) {
      this.board.push(this.deck.pop()!);
    }
    while (!boardHasSet(this.board) && this.deck.length > 0) {
      for (let i = 0; i < DEAL_STEP && this.deck.length > 0; i++) {
        this.board.push(this.deck.pop()!);
      }
    }
    if (this.deck.length === 0 && !boardHasSet(this.board)) {
      this.over = true;
    }
  }

  private lockout(playerId: string, now: number): ClaimResult {
    const until = now + LOCKOUT_MS;
    this.lockouts.set(playerId, until);
    return { result: 'invalid', lockoutUntil: until };
  }
}
