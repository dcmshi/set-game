// @vitest-environment node
import { WebSocket } from 'ws';
import { createServer } from './index';
import type { ClientMessage, ServerMessage } from '../../src/mp/protocol';

function open(port: number) {
  const ws = new WebSocket(`ws://localhost:${port}`);
  const inbox: ServerMessage[] = [];
  ws.on('message', (d) => inbox.push(JSON.parse(d.toString())));
  const send = (m: ClientMessage) => ws.send(JSON.stringify(m));
  const ready = new Promise<void>((res) => ws.on('open', () => res()));
  const next = (type: ServerMessage['type']) =>
    new Promise<ServerMessage>((res) => {
      const hit = inbox.find((m) => m.type === type);
      if (hit) return res(hit);
      ws.on('message', (d) => {
        const m: ServerMessage = JSON.parse(d.toString());
        if (m.type === type) res(m);
      });
    });
  return { ws, inbox, send, ready, next };
}

it('two clients race for the same Set — exactly one wins', async () => {
  const port = 8123;
  const server = createServer({ port });

  const host = open(port);
  await host.ready;
  host.send({ type: 'createRoom', name: 'Alice' });
  const joined = (await host.next('joined')) as Extract<ServerMessage, { type: 'joined' }>;
  const code = joined.code;

  const guest = open(port);
  await guest.ready;
  guest.send({ type: 'joinRoom', code, name: 'Bob' });
  await guest.next('joined');

  host.send({ type: 'startGame' });
  const gs = (await host.next('gameState')) as Extract<ServerMessage, { type: 'gameState' }>;

  const { findAnySet } = await import('../../src/game/set');
  const set = findAnySet(gs.board)!;
  const ids: [string, string, string] = [set[0].id, set[1].id, set[2].id];

  host.send({ type: 'claim', cardIds: ids });
  guest.send({ type: 'claim', cardIds: ids });

  const r1 = (await host.next('claimResult')) as Extract<ServerMessage, { type: 'claimResult' }>;
  const r2 = (await guest.next('claimResult')) as Extract<ServerMessage, { type: 'claimResult' }>;
  const results = [r1.result, r2.result].sort();
  expect(results).toEqual(['ok', 'taken']);

  host.ws.close();
  guest.ws.close();
  await server.close();
});
