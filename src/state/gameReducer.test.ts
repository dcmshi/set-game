import { gameReducer } from './gameReducer';
import { newGame } from '../game/engine';
import { findAnySet } from '../game/set';

it('routes actions to the engine', () => {
  const s0 = newGame(3);
  const set = findAnySet(s0.board)!;
  let s = gameReducer(s0, { type: 'SELECT', id: set[0].id });
  expect(s.selected).toEqual([set[0].id]);
  s = gameReducer(s0, { type: 'HINT' });
  expect(s.hintedIds).toHaveLength(3);
  const started = gameReducer(s0, { type: 'START', seed: 3 });
  expect(started.board.map((c) => c.id)).toEqual(s0.board.map((c) => c.id));
});
