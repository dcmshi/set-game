import type { Card } from '../game/cards';

export type Phase = 'lobby' | 'playing' | 'results';

export interface PlayerView {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  spectator: boolean;
}

export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
}

export type ClientMessage =
  | { type: 'createRoom'; name: string }
  | { type: 'joinRoom'; code: string; name: string }
  | { type: 'rejoin'; code: string; token: string }
  | { type: 'startGame' }
  | { type: 'claim'; cardIds: [string, string, string] }
  | { type: 'rematch' }
  | { type: 'leave' };

export type ServerMessage =
  | { type: 'joined'; code: string; you: { id: string; token: string }; phase: Phase }
  | { type: 'roomState'; code: string; phase: Phase; players: PlayerView[]; hostId: string }
  | {
      type: 'gameState';
      board: Card[];
      scores: Record<string, number>;
      deckCount: number;
      startedAt: number;
      yourLockoutUntil: number;
    }
  | { type: 'claimResult'; result: 'ok' | 'invalid' | 'taken'; lockoutUntil?: number }
  | { type: 'gameOver'; finalScores: ScoreEntry[]; winnerIds: string[]; durationMs: number }
  | { type: 'error'; code: string; message: string };
