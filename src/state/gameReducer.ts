import { newGame, selectCard, resolve, useHint } from '../game/engine';
import type { GameState } from '../game/engine';

export type GameAction =
  | { type: 'START'; seed?: number }
  | { type: 'SELECT'; id: string }
  | { type: 'RESOLVE' }
  | { type: 'HINT' };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START':
      return newGame(action.seed);
    case 'SELECT':
      return selectCard(state, action.id);
    case 'RESOLVE':
      return resolve(state);
    case 'HINT':
      return useHint(state);
    default:
      return state;
  }
}
