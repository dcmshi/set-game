import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { RoomManager, type Room } from './rooms';
import type { ClientMessage, ServerMessage } from '../../src/mp/protocol';

const TTL_MS = 60_000;
const SWEEP_INTERVAL_MS = 30_000;

interface Conn {
  ws: WebSocket;
  roomCode?: string;
  playerId?: string;
}

export function createServer(opts: { port?: number; now?: () => number } = {}) {
  const port = opts.port ?? Number(process.env.PORT ?? 8080);
  const now = opts.now ?? (() => Date.now());
  const rooms = new RoomManager(now);
  // Plain HTTP responder for health checks (Render pings the port before
  // routing traffic); WebSocket upgrades are handled by the attached wss.
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/healthz')) {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  });
  const wss = new WebSocketServer({ server });
  server.listen(port);
  const conns = new Map<WebSocket, Conn>();

  const send = (ws: WebSocket, msg: ServerMessage) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };

  const broadcast = (room: Room) => {
    for (const [ws, c] of conns) {
      if (c.roomCode !== room.code || !c.playerId) continue;
      send(ws, {
        type: 'roomState',
        code: room.code,
        phase: room.phase,
        players: room.roster(),
        hostId: room.hostId,
      });
      if (room.phase !== 'lobby') {
        send(ws, { type: 'gameState', ...room.gameStateFor(c.playerId) });
      }
    }
  };

  const attach = (ws: WebSocket, room: Room, playerId: string, token: string) => {
    const c = conns.get(ws)!;
    c.roomCode = room.code;
    c.playerId = playerId;
    send(ws, { type: 'joined', code: room.code, you: { id: playerId, token }, phase: room.phase });
    broadcast(room);
  };

  const handle = (ws: WebSocket, msg: ClientMessage) => {
    const c = conns.get(ws);
    if (!c) return;
    const room = c.roomCode ? rooms.get(c.roomCode) : undefined;

    switch (msg.type) {
      case 'createRoom': {
        const { room: r, player } = rooms.create(msg.name.slice(0, 20) || 'Player');
        attach(ws, r, player.id, player.token);
        break;
      }
      case 'joinRoom': {
        const res = rooms.join(msg.code.toUpperCase(), msg.name.slice(0, 20) || 'Player');
        if ('error' in res) return send(ws, { type: 'error', code: res.error, message: 'Cannot join room.' });
        attach(ws, res.room, res.player.id, res.player.token);
        break;
      }
      case 'rejoin': {
        const res = rooms.rejoin(msg.code.toUpperCase(), msg.token);
        if ('error' in res) return send(ws, { type: 'error', code: res.error, message: 'Cannot reconnect.' });
        attach(ws, res.room, res.player.id, res.player.token);
        break;
      }
      case 'startGame': {
        if (!room || room.hostId !== c.playerId)
          return send(ws, { type: 'error', code: 'not_host', message: 'Only the host can start.' });
        room.start(Math.floor(Math.random() * 2 ** 31));
        broadcast(room);
        break;
      }
      case 'claim': {
        if (!room || !c.playerId) return;
        const r = room.claim(c.playerId, msg.cardIds);
        send(ws, { type: 'claimResult', result: r.result, lockoutUntil: r.lockoutUntil });
        broadcast(room);
        if (room.phase === 'results') {
          const res = room.results();
          for (const [sock, cc] of conns) if (cc.roomCode === room.code) send(sock, { type: 'gameOver', ...res });
        }
        break;
      }
      case 'rematch': {
        if (!room || room.hostId !== c.playerId)
          return send(ws, { type: 'error', code: 'not_host', message: 'Only the host can rematch.' });
        room.rematch(Math.floor(Math.random() * 2 ** 31));
        broadcast(room);
        break;
      }
      case 'leave': {
        if (room && c.playerId) {
          room.removePlayer(c.playerId);
          broadcast(room);
        }
        c.roomCode = undefined;
        c.playerId = undefined;
        break;
      }
    }
  };

  wss.on('connection', (ws) => {
    conns.set(ws, { ws });
    ws.on('message', (data) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return send(ws, { type: 'error', code: 'bad_json', message: 'Malformed message.' });
      }
      try {
        handle(ws, msg);
      } catch {
        send(ws, { type: 'error', code: 'server_error', message: 'Something went wrong.' });
      }
    });
    ws.on('close', () => {
      const c = conns.get(ws);
      if (c?.roomCode && c.playerId) {
        const room = rooms.get(c.roomCode);
        if (room) {
          room.setConnected(c.playerId, false);
          broadcast(room);
        }
      }
      conns.delete(ws);
    });
  });

  const sweepTimer = setInterval(() => rooms.sweep(TTL_MS), SWEEP_INTERVAL_MS);
  if (typeof sweepTimer.unref === 'function') sweepTimer.unref();

  return {
    wss,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(sweepTimer);
        for (const ws of conns.keys()) ws.terminate();
        wss.close(() => server.close(() => resolve()));
      }),
  };
}

// Self-start when run directly (tsx server/src/index.ts).
if (process.env.VITEST === undefined) {
  createServer();
  // eslint-disable-next-line no-console
  console.log(`Set MP server listening on :${process.env.PORT ?? 8080}`);
}
