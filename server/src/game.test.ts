// @vitest-environment node
import { MpGame, BOARD_TARGET, LOCKOUT_MS } from './game';
import { boardHasSet, findAnySet, isSet } from '../../src/game/set';

function firstSetIds(g: MpGame): [string, string, string] {
  const s = findAnySet(g.board)!;
  return [s[0].id, s[1].id, s[2].id];
}

it('deals a starting board that contains a Set and initializes scores', () => {
  const g = new MpGame();
  g.deal(['p1', 'p2'], 42);
  expect(g.board.length).toBeGreaterThanOrEqual(BOARD_TARGET);
  expect(boardHasSet(g.board)).toBe(true);
  expect(g.scores).toEqual({ p1: 0, p2: 0 });
  expect(g.over).toBe(false);
  expect(g.board.length + g.deckCount).toBe(81);
});

it('is reproducible for a given seed', () => {
  const a = new MpGame();
  a.deal(['x'], 7);
  const b = new MpGame();
  b.deal(['x'], 7);
  expect(a.board.map((c) => c.id)).toEqual(b.board.map((c) => c.id));
});

it('accepts a valid Set: scores, removes cards, refills, keeps a Set available', () => {
  const g = new MpGame();
  g.deal(['p1'], 42);
  const ids = firstSetIds(g);
  const r = g.claim('p1', ids);
  expect(r.result).toBe('ok');
  expect(g.scores.p1).toBe(1);
  expect(g.board.some((c) => ids.includes(c.id))).toBe(false);
  if (!g.over) expect(boardHasSet(g.board)).toBe(true);
});

it('resolves a contested Set: second identical claim gets "taken", no double score', () => {
  const g = new MpGame();
  g.deal(['p1', 'p2'], 42);
  const ids = firstSetIds(g);
  expect(g.claim('p1', ids).result).toBe('ok');
  expect(g.claim('p2', ids).result).toBe('taken');
  expect(g.scores.p1).toBe(1);
  expect(g.scores.p2).toBe(0);
});

it('locks a player out for LOCKOUT_MS on an invalid (non-Set) claim', () => {
  let t = 1000;
  const g = new MpGame(() => t);
  g.deal(['p1'], 42);
  const [a, b] = g.board;
  const c = g.board.find((x, i) => i > 1 && !isSet(a, b, x))!;
  const r = g.claim('p1', [a.id, b.id, c.id]);
  expect(r.result).toBe('invalid');
  expect(r.lockoutUntil).toBe(1000 + LOCKOUT_MS);
  expect(g.lockoutFor('p1')).toBe(1000 + LOCKOUT_MS);
  t = 2000;
  expect(g.claim('p1', firstSetIds(g)).result).toBe('invalid');
  t = 1000 + LOCKOUT_MS + 1;
  expect(g.claim('p1', firstSetIds(g)).result).toBe('ok');
});

it('treats duplicate card ids as an invalid claim (not a trivial Set)', () => {
  const g = new MpGame(() => 0);
  g.deal(['p1'], 42);
  const id = g.board[0].id;
  expect(g.claim('p1', [id, id, id]).result).toBe('invalid');
});

it('replaces matched cards in place, keeping every other card in its slot', () => {
  const g = new MpGame();
  g.deal(['p1'], 42);
  const before = g.board.map((c) => c.id);
  expect(before).toHaveLength(12); // seed 42 deals a 12-card board that contains a Set
  const s = findAnySet(g.board)!;
  const ids: [string, string, string] = [s[0].id, s[1].id, s[2].id];
  const matchedIdx = new Set(ids.map((id) => before.indexOf(id)));
  g.claim('p1', ids);
  const after = g.board.map((c) => c.id);
  expect(after).toHaveLength(12);
  // Untouched cards keep their exact position; only the matched slots change.
  before.forEach((id, i) => {
    if (!matchedIdx.has(i)) expect(after[i]).toBe(id);
  });
  ids.forEach((id) => expect(after).not.toContain(id));
});

it('reports winners as all players tied for the top score', () => {
  const g = new MpGame();
  g.deal(['p1', 'p2', 'p3'], 42);
  expect(g.winnerIds().sort()).toEqual(['p1', 'p2', 'p3']);
});
