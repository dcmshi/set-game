// @vitest-environment node
import { RoomManager } from './rooms';
import { findAnySet } from '../../src/game/set';

it('creates a room with a host and a 4-letter code', () => {
  const mgr = new RoomManager();
  const { room, player } = mgr.create('Alice');
  expect(room.code).toMatch(/^[A-Z]{4}$/);
  expect(room.hostId).toBe(player.id);
  expect(room.phase).toBe('lobby');
  expect(room.roster()).toHaveLength(1);
});

it('joins an existing room and rejects a bad code', () => {
  const mgr = new RoomManager();
  const { room } = mgr.create('Alice');
  const joined = mgr.join(room.code, 'Bob');
  expect('room' in joined && joined.room.roster()).toHaveLength(2);
  const bad = mgr.join('ZZZZ', 'Nobody');
  expect('error' in bad).toBe(true);
});

it('enforces the player cap', () => {
  const mgr = new RoomManager();
  const { room } = mgr.create('host');
  for (let i = 0; i < 11; i++) mgr.join(room.code, `p${i}`); // 12 total
  const overflow = mgr.join(room.code, 'thirteenth');
  expect('error' in overflow && overflow.error).toBe('full');
});

it('late joiners during play are spectators and cannot claim', () => {
  const mgr = new RoomManager();
  const { room } = mgr.create('host');
  mgr.join(room.code, 'p2');
  room.start(42);
  const late = mgr.join(room.code, 'late');
  const latePlayer = 'room' in late ? late.player : null;
  expect(latePlayer?.spectator).toBe(true);
  const s = findAnySet(room.game.board)!;
  const r = room.claim(latePlayer!.id, [s[0].id, s[1].id, s[2].id]);
  expect(r.result).toBe('taken');
  expect(room.game.scores[latePlayer!.id]).toBeUndefined();
});

it('reconnects a disconnected player to the same seat by token', () => {
  const mgr = new RoomManager();
  const { room, player } = mgr.create('Alice');
  room.setConnected(player.id, false);
  const back = mgr.rejoin(room.code, player.token);
  expect('player' in back && back.player.id).toBe(player.id);
  expect(room.roster().find((p) => p.id === player.id)?.connected).toBe(true);
});

it('promotes a new host when the host leaves, and sweeps empty rooms', () => {
  let t = 0;
  const mgr = new RoomManager(() => t);
  const { room, player } = mgr.create('Alice');
  const bobRes = mgr.join(room.code, 'Bob');
  const bob = 'player' in bobRes ? bobRes.player : null;
  room.removePlayer(player.id);
  expect(room.hostId).toBe(bob!.id);
  room.removePlayer(bob!.id);
  expect(room.isEmpty()).toBe(true);
  t = 60_001;
  mgr.sweep(60_000);
  expect(mgr.get(room.code)).toBeUndefined();
});

it('rematch resets scores and promotes spectators to players', () => {
  const mgr = new RoomManager();
  const { room } = mgr.create('host');
  room.start(42);
  const late = mgr.join(room.code, 'late');
  const latePlayer = 'player' in late ? late.player : null;
  room.rematch(43);
  expect(latePlayer?.spectator).toBe(false);
  expect(room.game.scores[latePlayer!.id]).toBe(0);
  expect(room.phase).toBe('playing');
});
