# Multiplayer — Client Implementation Plan (Part 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Prerequisite:** Part 1 (server) is complete — `src/mp/protocol.ts` and the server exist and pass tests.

**Goal:** Build the client multiplayer experience against the Part-1 protocol: a socket wrapper, a `useMultiplayer` hook, and the UI (mode select, join/lobby, live shared board with scoreboard + lockout, results/rematch) — fully localized (en/zh) and tested. Single-player is untouched.

**Architecture:** A thin `MpSocket` wraps the browser `WebSocket` (injectable for tests). `useMultiplayer` owns the connection, reduces `ServerMessage`s into view state, persists a reconnect token, and exposes actions. A `MultiplayerApp` container renders phase-based screens, reusing the existing `Card`/`SetSvgDefs` for the board. App gains a `single | multi` mode; StartScreen gains a Multiplayer button; `/r/CODE` deep links open join directly.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library.

## Global Constraints

- **Reuse the shipped i18n layer** (`useT`): every new string goes in **both** `en` and `zh` in `src/i18n/strings.ts` (the existing `strings.test.ts` enforces key parity — adding to only one language fails the suite).
- **Reuse existing UI:** the board renders with the existing `Card` and `SetSvgDefs`; do not reimplement card SVGs.
- **Single-player is unchanged** — MP is additive.
- **Server URL:** `import.meta.env.VITE_MP_SERVER_URL`, falling back to `ws://localhost:8080` in dev.
- **Injectable socket:** `useMultiplayer(url, connectImpl?)` and `connect(url, handlers, WebSocketImpl?)` accept injected implementations so tests never open a real socket.
- **Branch:** `feature/multiplayer`. Verify `npm run typecheck`, `npm test`, `npm run build` before any merge (which auto-deploys the client to prod).
- **Commands:** `npx vitest run <path>` (single), `npm test` (all), `npm run typecheck`.

---

## File Structure

**New (client)**
- `src/mp/socket.ts` — `connect()` WebSocket wrapper; `MpSocket`, `SocketStatus`.
- `src/mp/useMultiplayer.ts` — connection + view-state hook.
- `src/components/mp/MpJoin.tsx` — create/join form.
- `src/components/mp/Lobby.tsx` — roster + share link + start.
- `src/components/mp/Scoreboard.tsx` — live scores + status chips.
- `src/components/mp/MpBoard.tsx` — shared board with local selection + lockout overlay.
- `src/components/mp/MpResults.tsx` — winner + rematch/leave.
- `src/components/mp/MultiplayerApp.tsx` — phase router container.
- Test files alongside the above where noted.

**Modified**
- `src/i18n/strings.ts` — MP strings (en + zh).
- `src/vite-env.d.ts` — type `VITE_MP_SERVER_URL`.
- `src/components/StartScreen.tsx` — Multiplayer button (`onMultiplayer` prop).
- `src/components/Screens.test.tsx` — pass the new prop.
- `src/App.tsx` — `single | multi` mode + `/r/CODE` deep-link entry.
- `src/index.css` — MP styles.

---

## Task 1: Env typing + MP strings

**Files:**
- Modify: `src/vite-env.d.ts`, `src/i18n/strings.ts`
- Test: existing `src/i18n/strings.test.ts` (must stay green)

- [ ] **Step 1: Type the env var — `src/vite-env.d.ts`**

Append (keep the existing `/// <reference types="vite/client" />` line):
```ts
interface ImportMetaEnv {
  readonly VITE_MP_SERVER_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 2: Add MP strings to `src/i18n/strings.ts`**

Add these entries to the **`en`** object (before the closing `} as const;`):
```ts
  'start.multiplayerBtn': 'Play with Friends',

  'mp.back': '← Back',
  'mp.yourName': 'Your name',
  'mp.createRoom': 'Create room',
  'mp.roomCode': 'Room code',
  'mp.join': 'Join',
  'mp.lobby': 'Lobby',
  'mp.shareHint': 'Share this link to invite players:',
  'mp.players': 'Players',
  'mp.startGame': 'Start game',
  'mp.waitingHost': 'Waiting for the host to start…',
  'mp.you': 'you',
  'mp.host': 'host',
  'mp.spectating': 'spectating',
  'mp.disconnectedTag': 'offline',
  'mp.lockedSecs': 'Locked {secs}s',
  'mp.notASet': 'Not a Set!',
  'mp.room': 'Room',
  'mp.gameOver': 'Game over',
  'mp.winnerIs': '{name} wins!',
  'mp.draw': "It's a draw!",
  'mp.rematch': 'Rematch',
  'mp.leave': 'Leave',
  'mp.connecting': 'Connecting…',
  'mp.waking': 'Waking up the server… (free tier can take ~30s on first connect)',
  'mp.reconnecting': 'Connection lost — reconnecting…',
  'mp.errNotFound': 'Room not found.',
  'mp.errFull': 'That room is full.',
  'mp.errGeneric': 'Something went wrong. Try again.',
```

Add the **matching keys** to the **`zh`** object:
```ts
  'start.multiplayerBtn': '多人对战',

  'mp.back': '← 返回',
  'mp.yourName': '你的名字',
  'mp.createRoom': '创建房间',
  'mp.roomCode': '房间代码',
  'mp.join': '加入',
  'mp.lobby': '等待室',
  'mp.shareHint': '分享此链接邀请玩家：',
  'mp.players': '玩家',
  'mp.startGame': '开始游戏',
  'mp.waitingHost': '等待房主开始……',
  'mp.you': '你',
  'mp.host': '房主',
  'mp.spectating': '观战中',
  'mp.disconnectedTag': '已断开',
  'mp.lockedSecs': '锁定 {secs}秒',
  'mp.notASet': '不是一组 Set！',
  'mp.room': '房间',
  'mp.gameOver': '游戏结束',
  'mp.winnerIs': '{name} 获胜！',
  'mp.draw': '平局！',
  'mp.rematch': '再来一局',
  'mp.leave': '离开',
  'mp.connecting': '连接中……',
  'mp.waking': '正在唤醒服务器……（免费服务器首次连接可能需约 30 秒）',
  'mp.reconnecting': '连接断开——正在重连……',
  'mp.errNotFound': '找不到房间。',
  'mp.errFull': '房间已满。',
  'mp.errGeneric': '出错了，请重试。',
```

- [ ] **Step 3: Run parity test + typecheck**

Run: `npx vitest run src/i18n/strings.test.ts && npm run typecheck`
Expected: PASS (key sets identical, no empty values); typecheck clean.

- [ ] **Step 4: Commit**

```bash
git add src/vite-env.d.ts src/i18n/strings.ts
git commit -m "feat(mp): env typing and bilingual multiplayer strings"
```

---

## Task 2: Socket wrapper

**Files:**
- Create: `src/mp/socket.ts`
- Test: `src/mp/socket.test.ts`

**Interfaces:**
- Consumes: `ClientMessage`, `ServerMessage` from `./protocol`.
- Produces: `type SocketStatus = 'connecting' | 'open' | 'closed'`; `interface MpSocket { send(m: ClientMessage): void; close(): void }`; `interface ConnectHandlers { onMessage(m: ServerMessage): void; onStatus(s: SocketStatus): void }`; `function connect(url, handlers, WS?): MpSocket`.

- [ ] **Step 1: Write the failing test**

```tsx
import { connect, type SocketStatus } from './socket';
import type { ServerMessage } from './protocol';

class FakeWS {
  static OPEN = 1;
  static instances: FakeWS[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  sent: string[] = [];
  constructor(public url: string) {
    FakeWS.instances.push(this);
  }
  send(d: string) { this.sent.push(d); }
  close() { this.readyState = 3; this.onclose?.(); }
  _open() { this.readyState = FakeWS.OPEN; this.onopen?.(); }
  _msg(m: ServerMessage) { this.onmessage?.({ data: JSON.stringify(m) }); }
}

beforeEach(() => (FakeWS.instances = []));

it('reports status transitions and parses inbound messages', () => {
  const statuses: SocketStatus[] = [];
  const messages: ServerMessage[] = [];
  connect('ws://x', { onStatus: (s) => statuses.push(s), onMessage: (m) => messages.push(m) }, FakeWS as never);
  const ws = FakeWS.instances[0];
  expect(statuses).toEqual(['connecting']);
  ws._open();
  ws._msg({ type: 'error', code: 'x', message: 'y' });
  expect(statuses).toEqual(['connecting', 'open']);
  expect(messages[0]).toEqual({ type: 'error', code: 'x', message: 'y' });
});

it('only sends when the socket is open, and serializes messages', () => {
  const sock = connect('ws://x', { onStatus: () => {}, onMessage: () => {} }, FakeWS as never);
  const ws = FakeWS.instances[0];
  sock.send({ type: 'startGame' });
  expect(ws.sent).toHaveLength(0); // not open yet
  ws._open();
  sock.send({ type: 'startGame' });
  expect(JSON.parse(ws.sent[0])).toEqual({ type: 'startGame' });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/mp/socket.test.ts`
Expected: FAIL — cannot find module `./socket`.

- [ ] **Step 3: Implement `src/mp/socket.ts`**

```ts
import type { ClientMessage, ServerMessage } from './protocol';

export type SocketStatus = 'connecting' | 'open' | 'closed';

export interface MpSocket {
  send(msg: ClientMessage): void;
  close(): void;
}

export interface ConnectHandlers {
  onMessage(msg: ServerMessage): void;
  onStatus(status: SocketStatus): void;
}

export function connect(
  url: string,
  handlers: ConnectHandlers,
  WS: typeof WebSocket = WebSocket
): MpSocket {
  const ws = new WS(url);
  handlers.onStatus('connecting');
  ws.onopen = () => handlers.onStatus('open');
  ws.onclose = () => handlers.onStatus('closed');
  ws.onmessage = (e: MessageEvent) => {
    try {
      handlers.onMessage(JSON.parse(e.data) as ServerMessage);
    } catch {
      /* ignore malformed frame */
    }
  };
  return {
    send: (msg) => {
      if (ws.readyState === WS.OPEN) ws.send(JSON.stringify(msg));
    },
    close: () => ws.close(),
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/mp/socket.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mp/socket.ts src/mp/socket.test.ts
git commit -m "feat(mp): typed websocket wrapper"
```

---

## Task 3: useMultiplayer hook

**Files:**
- Create: `src/mp/useMultiplayer.ts`
- Test: `src/mp/useMultiplayer.test.tsx`

**Interfaces:**
- Consumes: `connect`, `MpSocket`, `SocketStatus`, `ConnectHandlers` from `./socket`; all protocol types.
- Produces: `useMultiplayer(url: string, connectImpl?: typeof connect): Mp` where `Mp` holds view state + actions:
  ```ts
  interface Mp {
    status: SocketStatus | 'idle';
    phase: Phase | 'none';
    code: string | null;
    you: { id: string; token: string } | null;
    players: PlayerView[];
    hostId: string | null;
    board: Card[];
    scores: Record<string, number>;
    deckCount: number;
    startedAt: number;
    lockoutUntil: number;
    lastClaim: 'ok' | 'invalid' | 'taken' | null;
    results: { finalScores: ScoreEntry[]; winnerIds: string[]; durationMs: number } | null;
    error: string | null;
    createRoom(name: string): void;
    join(code: string, name: string): void;
    start(): void;
    claim(ids: [string, string, string]): void;
    rematch(): void;
    leave(): void;
  }
  ```
- Persists `{ code, token }` to `localStorage['set-game:mp']`; on socket open with a stored token, auto-sends `rejoin`.

- [ ] **Step 1: Write the failing test**

```tsx
import { renderHook, act } from '@testing-library/react';
import { useMultiplayer } from './useMultiplayer';
import type { ConnectHandlers, MpSocket } from './socket';
import type { ClientMessage, ServerMessage } from './protocol';

// A controllable fake connect(): capture handlers + sent messages.
function makeFakeConnect() {
  const sent: ClientMessage[] = [];
  let handlers: ConnectHandlers | null = null;
  const socket: MpSocket = { send: (m) => sent.push(m), close: () => {} };
  const connectImpl = ((_url: string, h: ConnectHandlers) => {
    handlers = h;
    h.onStatus('connecting');
    return socket;
  }) as never;
  return {
    sent,
    connectImpl,
    open: () => handlers!.onStatus('open'),
    recv: (m: ServerMessage) => handlers!.onMessage(m),
  };
}

beforeEach(() => localStorage.clear());

it('creates a room and tracks lobby roster', () => {
  const f = makeFakeConnect();
  const { result } = renderHook(() => useMultiplayer('ws://x', f.connectImpl));
  act(() => f.open());
  act(() => result.current.createRoom('Alice'));
  expect(f.sent).toContainEqual({ type: 'createRoom', name: 'Alice' });

  act(() => f.recv({ type: 'joined', code: 'ABCD', you: { id: 'p1', token: 't1' }, phase: 'lobby' }));
  act(() =>
    f.recv({
      type: 'roomState',
      code: 'ABCD',
      phase: 'lobby',
      hostId: 'p1',
      players: [{ id: 'p1', name: 'Alice', score: 0, connected: true, spectator: false }],
    })
  );
  expect(result.current.code).toBe('ABCD');
  expect(result.current.phase).toBe('lobby');
  expect(result.current.players).toHaveLength(1);
  expect(localStorage.getItem('set-game:mp')).toContain('ABCD');
});

it('surfaces game state, claim results, and game over', () => {
  const f = makeFakeConnect();
  const { result } = renderHook(() => useMultiplayer('ws://x', f.connectImpl));
  act(() => f.open());
  act(() => f.recv({ type: 'joined', code: 'ABCD', you: { id: 'p1', token: 't1' }, phase: 'playing' }));
  act(() =>
    f.recv({
      type: 'gameState',
      board: [],
      scores: { p1: 2 },
      deckCount: 30,
      startedAt: 1000,
      yourLockoutUntil: 5000,
    })
  );
  expect(result.current.scores.p1).toBe(2);
  expect(result.current.lockoutUntil).toBe(5000);

  act(() => result.current.claim(['a', 'b', 'c']));
  expect(f.sent).toContainEqual({ type: 'claim', cardIds: ['a', 'b', 'c'] });

  act(() => f.recv({ type: 'claimResult', result: 'invalid', lockoutUntil: 6000 }));
  expect(result.current.lastClaim).toBe('invalid');

  act(() =>
    f.recv({ type: 'gameOver', finalScores: [{ id: 'p1', name: 'Alice', score: 2 }], winnerIds: ['p1'], durationMs: 9000 })
  );
  expect(result.current.results?.winnerIds).toEqual(['p1']);
});

it('maps error codes to messages', () => {
  const f = makeFakeConnect();
  const { result } = renderHook(() => useMultiplayer('ws://x', f.connectImpl));
  act(() => f.open());
  act(() => f.recv({ type: 'error', code: 'full', message: 'x' }));
  expect(result.current.error).toBe('full');
});

it('auto-rejoins with a stored token when the socket opens', () => {
  localStorage.setItem('set-game:mp', JSON.stringify({ code: 'WXYZ', token: 'tok' }));
  const f = makeFakeConnect();
  renderHook(() => useMultiplayer('ws://x', f.connectImpl));
  act(() => f.open());
  expect(f.sent).toContainEqual({ type: 'rejoin', code: 'WXYZ', token: 'tok' });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/mp/useMultiplayer.test.tsx`
Expected: FAIL — cannot find module `./useMultiplayer`.

- [ ] **Step 3: Implement `src/mp/useMultiplayer.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { connect as defaultConnect, type MpSocket, type SocketStatus } from './socket';
import type { Card } from '../game/cards';
import type { ClientMessage, ServerMessage, PlayerView, ScoreEntry, Phase } from './protocol';

const STORE_KEY = 'set-game:mp';

interface Stored { code: string; token: string }

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}
function saveStored(s: Stored | null): void {
  try {
    if (s) localStorage.setItem(STORE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

export interface Mp {
  status: SocketStatus | 'idle';
  phase: Phase | 'none';
  code: string | null;
  you: { id: string; token: string } | null;
  players: PlayerView[];
  hostId: string | null;
  board: Card[];
  scores: Record<string, number>;
  deckCount: number;
  startedAt: number;
  lockoutUntil: number;
  lastClaim: 'ok' | 'invalid' | 'taken' | null;
  results: { finalScores: ScoreEntry[]; winnerIds: string[]; durationMs: number } | null;
  error: string | null;
  createRoom(name: string): void;
  join(code: string, name: string): void;
  start(): void;
  claim(ids: [string, string, string]): void;
  rematch(): void;
  leave(): void;
}

export function useMultiplayer(url: string, connectImpl: typeof defaultConnect = defaultConnect): Mp {
  const [status, setStatus] = useState<SocketStatus | 'idle'>('idle');
  const [phase, setPhase] = useState<Phase | 'none'>('none');
  const [code, setCode] = useState<string | null>(null);
  const [you, setYou] = useState<{ id: string; token: string } | null>(null);
  const [players, setPlayers] = useState<PlayerView[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [board, setBoard] = useState<Card[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [deckCount, setDeckCount] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [lastClaim, setLastClaim] = useState<'ok' | 'invalid' | 'taken' | null>(null);
  const [results, setResults] = useState<Mp['results']>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<MpSocket | null>(null);
  const send = useCallback((msg: ClientMessage) => socketRef.current?.send(msg), []);

  useEffect(() => {
    const socket = connectImpl(url, {
      onStatus: (s) => {
        setStatus(s);
        if (s === 'open') {
          const stored = loadStored();
          if (stored) send({ type: 'rejoin', code: stored.code, token: stored.token });
        }
      },
      onMessage: (m: ServerMessage) => {
        switch (m.type) {
          case 'joined':
            setCode(m.code);
            setYou(m.you);
            setPhase(m.phase);
            setError(null);
            saveStored({ code: m.code, token: m.you.token });
            break;
          case 'roomState':
            setPhase(m.phase);
            setPlayers(m.players);
            setHostId(m.hostId);
            break;
          case 'gameState':
            setBoard(m.board);
            setScores(m.scores);
            setDeckCount(m.deckCount);
            setStartedAt(m.startedAt);
            setLockoutUntil(m.yourLockoutUntil);
            break;
          case 'claimResult':
            setLastClaim(m.result);
            if (m.lockoutUntil) setLockoutUntil(m.lockoutUntil);
            break;
          case 'gameOver':
            setResults({ finalScores: m.finalScores, winnerIds: m.winnerIds, durationMs: m.durationMs });
            setPhase('results');
            break;
          case 'error':
            setError(m.code);
            break;
        }
      },
    });
    socketRef.current = socket;
    return () => socket.close();
  }, [url, connectImpl, send]);

  const createRoom = useCallback((name: string) => { setError(null); send({ type: 'createRoom', name }); }, [send]);
  const join = useCallback((c: string, name: string) => { setError(null); send({ type: 'joinRoom', code: c, name }); }, [send]);
  const start = useCallback(() => send({ type: 'startGame' }), [send]);
  const claim = useCallback((ids: [string, string, string]) => send({ type: 'claim', cardIds: ids }), [send]);
  const rematch = useCallback(() => { setResults(null); send({ type: 'rematch' }); }, [send]);
  const leave = useCallback(() => {
    send({ type: 'leave' });
    saveStored(null);
    setPhase('none');
    setCode(null);
    setResults(null);
  }, [send]);

  return {
    status, phase, code, you, players, hostId, board, scores, deckCount, startedAt,
    lockoutUntil, lastClaim, results, error,
    createRoom, join, start, claim, rematch, leave,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/mp/useMultiplayer.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mp/useMultiplayer.ts src/mp/useMultiplayer.test.tsx
git commit -m "feat(mp): useMultiplayer connection and view-state hook"
```

---

## Task 4: Join form + Lobby

**Files:**
- Create: `src/components/mp/MpJoin.tsx`, `src/components/mp/Lobby.tsx`
- Test: `src/components/mp/Lobby.test.tsx`

**Interfaces:**
- Consumes: `useT`; `PlayerView` from `../../mp/protocol`.
- Produces:
  - `MpJoin({ initialCode, onCreate, onJoin, error }: { initialCode?: string; onCreate(name): void; onJoin(code, name): void; error: string | null })`.
  - `Lobby({ code, players, hostId, youId, isHost, onStart }: { code: string; players: PlayerView[]; hostId: string; youId: string; isHost: boolean; onStart(): void })`.

- [ ] **Step 1: Write the failing test (Lobby)**

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '../../test/renderWithI18n';
import { Lobby } from './Lobby';
import type { PlayerView } from '../../mp/protocol';

const players: PlayerView[] = [
  { id: 'p1', name: 'Alice', score: 0, connected: true, spectator: false },
  { id: 'p2', name: 'Bob', score: 0, connected: true, spectator: false },
];

it('shows the room code and roster, and the host can start', async () => {
  const onStart = vi.fn();
  renderWithI18n(<Lobby code="ABCD" players={players} hostId="p1" youId="p1" isHost onStart={onStart} />);
  expect(screen.getByText('ABCD')).toBeInTheDocument();
  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('Bob')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /start game/i }));
  expect(onStart).toHaveBeenCalled();
});

it('hides the start button for non-hosts and shows a waiting note', () => {
  renderWithI18n(<Lobby code="ABCD" players={players} hostId="p1" youId="p2" isHost={false} onStart={() => {}} />);
  expect(screen.queryByRole('button', { name: /start game/i })).not.toBeInTheDocument();
  expect(screen.getByText(/waiting for the host/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/mp/Lobby.test.tsx`
Expected: FAIL — cannot find module `./Lobby`.

- [ ] **Step 3: Implement `src/components/mp/MpJoin.tsx`**

```tsx
import { useState } from 'react';
import { useT } from '../../i18n/LanguageContext';

interface MpJoinProps {
  initialCode?: string;
  error: string | null;
  onCreate(name: string): void;
  onJoin(code: string, name: string): void;
}

const ERR_KEY: Record<string, 'mp.errNotFound' | 'mp.errFull' | 'mp.errGeneric'> = {
  not_found: 'mp.errNotFound',
  full: 'mp.errFull',
};

export function MpJoin({ initialCode = '', error, onCreate, onJoin }: MpJoinProps) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode.toUpperCase());
  const trimmed = name.trim();

  return (
    <div className="screen mp-join">
      <h2>{t('start.multiplayerBtn')}</h2>
      <label className="mp-field">
        {t('mp.yourName')}
        <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
      </label>
      <button type="button" className="primary-btn" disabled={!trimmed} onClick={() => onCreate(trimmed)}>
        {t('mp.createRoom')}
      </button>
      <div className="mp-join-divider" />
      <label className="mp-field">
        {t('mp.roomCode')}
        <input
          value={code}
          maxLength={4}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
        />
      </label>
      <button
        type="button"
        className="primary-btn"
        disabled={!trimmed || code.length !== 4}
        onClick={() => onJoin(code, trimmed)}
      >
        {t('mp.join')}
      </button>
      {error && <p className="mp-error">{t(ERR_KEY[error] ?? 'mp.errGeneric')}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Implement `src/components/mp/Lobby.tsx`**

```tsx
import { useT } from '../../i18n/LanguageContext';
import type { PlayerView } from '../../mp/protocol';

interface LobbyProps {
  code: string;
  players: PlayerView[];
  hostId: string;
  youId: string;
  isHost: boolean;
  onStart(): void;
}

export function Lobby({ code, players, hostId, youId, isHost, onStart }: LobbyProps) {
  const { t } = useT();
  const link = `${window.location.origin}/r/${code}`;

  return (
    <div className="screen mp-lobby">
      <h2>{t('mp.lobby')}</h2>
      <p className="mp-room-code">{t('mp.room')} <strong>{code}</strong></p>
      <p className="mp-share">{t('mp.shareHint')}</p>
      <code className="mp-share-link">{link}</code>

      <h3 className="howto-subtitle">{t('mp.players')} ({players.length})</h3>
      <ul className="mp-roster">
        {players.map((p) => (
          <li key={p.id}>
            {p.name}
            {p.id === youId && <span className="mp-tag"> ({t('mp.you')})</span>}
            {p.id === hostId && <span className="mp-tag"> · {t('mp.host')}</span>}
            {p.spectator && <span className="mp-tag"> · {t('mp.spectating')}</span>}
            {!p.connected && <span className="mp-tag mp-tag-off"> · {t('mp.disconnectedTag')}</span>}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button type="button" className="primary-btn" onClick={onStart}>
          {t('mp.startGame')}
        </button>
      ) : (
        <p className="mp-waiting">{t('mp.waitingHost')}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/components/mp/Lobby.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/mp/MpJoin.tsx src/components/mp/Lobby.tsx src/components/mp/Lobby.test.tsx
git commit -m "feat(mp): join form and lobby screen"
```

---

## Task 5: Scoreboard, board, and lockout overlay

**Files:**
- Create: `src/components/mp/Scoreboard.tsx`, `src/components/mp/MpBoard.tsx`
- Test: `src/components/mp/MpBoard.test.tsx`, `src/components/mp/Scoreboard.test.tsx`

**Interfaces:**
- Consumes: `useT`; `Card` component + `SetSvgDefs`; `Card` type; `PlayerView`.
- Produces:
  - `Scoreboard({ players, youId }: { players: PlayerView[]; youId: string })`.
  - `MpBoard({ board, lockoutUntil, wrongFlash, onClaim }: { board: Card[]; lockoutUntil: number; wrongFlash: boolean; onClaim(ids: [string,string,string]): void })` — local selection of up to 3; auto-calls `onClaim` at 3 then clears; shows a lockout overlay with a live countdown while `Date.now() < lockoutUntil`.

- [ ] **Step 1: Write the failing tests**

`src/components/mp/Scoreboard.test.tsx`:
```tsx
import { screen } from '@testing-library/react';
import { renderWithI18n } from '../../test/renderWithI18n';
import { Scoreboard } from './Scoreboard';
import type { PlayerView } from '../../mp/protocol';

it('renders players sorted by score with the leader first', () => {
  const players: PlayerView[] = [
    { id: 'p1', name: 'Alice', score: 1, connected: true, spectator: false },
    { id: 'p2', name: 'Bob', score: 3, connected: true, spectator: false },
  ];
  renderWithI18n(<Scoreboard players={players} youId="p1" />);
  const items = screen.getAllByRole('listitem').map((li) => li.textContent);
  expect(items[0]).toContain('Bob');
  expect(items[0]).toContain('3');
});
```

`src/components/mp/MpBoard.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '../../test/renderWithI18n';
import { MpBoard } from './MpBoard';
import { cardId, type Card } from '../../game/cards';
import { cardAriaLabel } from '../../i18n/cardAria';

const mk = (c: Omit<Card, 'id'>): Card => ({ id: cardId(c), ...c });
const board: Card[] = [
  mk({ count: 1, shape: 'diamond', shading: 'solid', color: 'red' }),
  mk({ count: 2, shape: 'squiggle', shading: 'striped', color: 'green' }),
  mk({ count: 3, shape: 'oval', shading: 'open', color: 'purple' }),
];

it('claims after three cards are selected, then clears selection', async () => {
  const onClaim = vi.fn();
  renderWithI18n(<MpBoard board={board} lockoutUntil={0} wrongFlash={false} onClaim={onClaim} />);
  for (const c of board) {
    await userEvent.click(screen.getByRole('button', { name: cardAriaLabel(c, 'en') }));
  }
  expect(onClaim).toHaveBeenCalledWith([board[0].id, board[1].id, board[2].id]);
});

it('shows a lockout overlay while locked out', () => {
  renderWithI18n(<MpBoard board={board} lockoutUntil={Date.now() + 5000} wrongFlash={false} onClaim={() => {}} />);
  expect(screen.getByText(/locked/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/components/mp/MpBoard.test.tsx src/components/mp/Scoreboard.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/components/mp/Scoreboard.tsx`**

```tsx
import { useT } from '../../i18n/LanguageContext';
import type { PlayerView } from '../../mp/protocol';

export function Scoreboard({ players, youId }: { players: PlayerView[]; youId: string }) {
  const { t } = useT();
  const sorted = [...players].filter((p) => !p.spectator).sort((a, b) => b.score - a.score);
  return (
    <ul className="mp-scoreboard">
      {sorted.map((p) => (
        <li key={p.id} className={p.connected ? '' : 'mp-off'}>
          <span className="mp-score-name">
            {p.name}
            {p.id === youId && <span className="mp-tag"> ({t('mp.you')})</span>}
          </span>
          <strong className="mp-score-num">{p.score}</strong>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Implement `src/components/mp/MpBoard.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Card } from '../Card';
import { SetSvgDefs } from '../SetSvgDefs';
import { useT } from '../../i18n/LanguageContext';
import type { Card as CardModel } from '../../game/cards';

interface MpBoardProps {
  board: CardModel[];
  lockoutUntil: number;
  wrongFlash: boolean;
  onClaim(ids: [string, string, string]): void;
}

export function MpBoard({ board, lockoutUntil, wrongFlash, onClaim }: MpBoardProps) {
  const { t } = useT();
  const [selected, setSelected] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(0);

  const locked = remaining > 0;

  // Live countdown while locked out.
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [lockoutUntil]);

  // Clear selection whenever the board changes (a Set was claimed by someone).
  useEffect(() => setSelected([]), [board]);

  const toggle = (id: string) => {
    if (locked) return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const next = [...prev, id];
      if (next.length === 3) {
        onClaim(next as [string, string, string]);
        return [];
      }
      return next;
    });
  };

  return (
    <div className={`mp-board-wrap${wrongFlash ? ' mp-wrong' : ''}`}>
      <div className="board">
        <SetSvgDefs />
        {board.map((card) => (
          <Card
            key={card.id}
            card={card}
            selected={selected.includes(card.id)}
            hinted={false}
            feedback={null}
            onSelect={toggle}
          />
        ))}
      </div>
      {locked && (
        <div className="mp-lockout" role="status">
          {t('mp.lockedSecs', { secs: remaining })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run src/components/mp/MpBoard.test.tsx src/components/mp/Scoreboard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/mp/Scoreboard.tsx src/components/mp/MpBoard.tsx src/components/mp/MpBoard.test.tsx src/components/mp/Scoreboard.test.tsx
git commit -m "feat(mp): shared board with selection/lockout and live scoreboard"
```

---

## Task 6: Results, container, App wiring, styles, verification

**Files:**
- Create: `src/components/mp/MpResults.tsx`, `src/components/mp/MultiplayerApp.tsx`
- Test: `src/components/mp/MpResults.test.tsx`
- Modify: `src/components/StartScreen.tsx`, `src/components/Screens.test.tsx`, `src/App.tsx`, `src/index.css`

**Interfaces:**
- Consumes: `useMultiplayer`, all MP components, `useT`.
- Produces:
  - `MpResults({ finalScores, winnerIds, isHost, onRematch, onLeave }: {...})`.
  - `MultiplayerApp({ serverUrl, initialCode, onExit }: { serverUrl: string; initialCode?: string; onExit(): void })`.
  - `StartScreen` gains `onMultiplayer: () => void`.

- [ ] **Step 1: Write the failing test (MpResults)**

`src/components/mp/MpResults.test.tsx`:
```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '../../test/renderWithI18n';
import { MpResults } from './MpResults';
import type { ScoreEntry } from '../../mp/protocol';

const finalScores: ScoreEntry[] = [
  { id: 'p1', name: 'Alice', score: 5 },
  { id: 'p2', name: 'Bob', score: 3 },
];

it('announces a single winner and lets the host rematch', async () => {
  const onRematch = vi.fn();
  renderWithI18n(
    <MpResults finalScores={finalScores} winnerIds={['p1']} isHost onRematch={onRematch} onLeave={() => {}} />
  );
  expect(screen.getByText(/Alice wins/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /rematch/i }));
  expect(onRematch).toHaveBeenCalled();
});

it('announces a draw when multiple winners tie', () => {
  renderWithI18n(
    <MpResults finalScores={finalScores} winnerIds={['p1', 'p2']} isHost={false} onRematch={() => {}} onLeave={() => {}} />
  );
  expect(screen.getByText(/draw/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /rematch/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/mp/MpResults.test.tsx`
Expected: FAIL — cannot find module `./MpResults`.

- [ ] **Step 3: Implement `src/components/mp/MpResults.tsx`**

```tsx
import { useT } from '../../i18n/LanguageContext';
import type { ScoreEntry } from '../../mp/protocol';

interface MpResultsProps {
  finalScores: ScoreEntry[];
  winnerIds: string[];
  isHost: boolean;
  onRematch(): void;
  onLeave(): void;
}

export function MpResults({ finalScores, winnerIds, isHost, onRematch, onLeave }: MpResultsProps) {
  const { t } = useT();
  const winnerName = finalScores.find((s) => s.id === winnerIds[0])?.name ?? '';
  const headline = winnerIds.length === 1 ? t('mp.winnerIs', { name: winnerName }) : t('mp.draw');

  return (
    <div className="screen mp-results">
      <p className="win-eyebrow">{t('mp.gameOver')}</p>
      <h2>{headline}</h2>
      <ul className="mp-final-scores">
        {finalScores.map((s) => (
          <li key={s.id} className={winnerIds.includes(s.id) ? 'mp-winner' : ''}>
            <span>{s.name}</span>
            <strong>{s.score}</strong>
          </li>
        ))}
      </ul>
      {isHost && (
        <button type="button" className="primary-btn" onClick={onRematch}>
          {t('mp.rematch')}
        </button>
      )}
      <button type="button" className="text-btn" onClick={onLeave}>
        {t('mp.leave')}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Implement `src/components/mp/MultiplayerApp.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useMultiplayer } from '../../mp/useMultiplayer';
import { useT } from '../../i18n/LanguageContext';
import { MpJoin } from './MpJoin';
import { Lobby } from './Lobby';
import { MpBoard } from './MpBoard';
import { Scoreboard } from './Scoreboard';
import { MpResults } from './MpResults';
import { Timer } from '../Timer';

interface MultiplayerAppProps {
  serverUrl: string;
  initialCode?: string;
  onExit(): void;
}

export function MultiplayerApp({ serverUrl, initialCode, onExit }: MultiplayerAppProps) {
  const { t } = useT();
  const mp = useMultiplayer(serverUrl);
  const [wrongFlash, setWrongFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flash the board red on an invalid claim.
  useEffect(() => {
    if (mp.lastClaim === 'invalid') {
      setWrongFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setWrongFlash(false), 500);
    }
  }, [mp.lastClaim, mp.lockoutUntil]);

  const isHost = mp.you?.id === mp.hostId;

  if (mp.status === 'connecting' && mp.phase === 'none') {
    return <div className="screen mp-status"><p>{t('mp.waking')}</p><button className="text-btn" onClick={onExit}>{t('mp.back')}</button></div>;
  }

  const leave = () => { mp.leave(); onExit(); };

  return (
    <div className="mp-app">
      {mp.phase === 'none' && (
        <>
          <MpJoin initialCode={initialCode} error={mp.error} onCreate={mp.createRoom} onJoin={mp.join} />
          <button type="button" className="text-btn" onClick={onExit}>{t('mp.back')}</button>
        </>
      )}

      {mp.phase === 'lobby' && mp.code && mp.you && (
        <Lobby code={mp.code} players={mp.players} hostId={mp.hostId ?? ''} youId={mp.you.id} isHost={isHost} onStart={mp.start} />
      )}

      {mp.phase === 'playing' && mp.you && (
        <div className="game mp-game">
          <header className="topbar">
            <Timer ms={Math.max(0, Date.now() - mp.startedAt)} />
          </header>
          <div className="mp-play">
            <MpBoard board={mp.board} lockoutUntil={mp.lockoutUntil} wrongFlash={wrongFlash} onClaim={mp.claim} />
            <Scoreboard players={mp.players} youId={mp.you.id} />
          </div>
          {mp.status === 'closed' && <p className="mp-reconnect">{t('mp.reconnecting')}</p>}
        </div>
      )}

      {mp.phase === 'results' && mp.results && (
        <MpResults
          finalScores={mp.results.finalScores}
          winnerIds={mp.results.winnerIds}
          isHost={isHost}
          onRematch={mp.rematch}
          onLeave={leave}
        />
      )}
    </div>
  );
}
```

> Note: the match `Timer` uses `Date.now()` re-evaluated on each render driven by MP state updates; it is a flavor clock, not authoritative, so exact ticking isn't required (per spec §5).

- [ ] **Step 5: Add the Multiplayer button to `src/components/StartScreen.tsx`**

Add `onMultiplayer: () => void` to `StartScreenProps`, and add a button after the How-to-Play button:
```tsx
      <button type="button" className="text-btn" onClick={onMultiplayer}>
        {t('start.multiplayerBtn')}
      </button>
```
(Add `onMultiplayer` to the destructured props and the interface.)

- [ ] **Step 6: Update `src/components/Screens.test.tsx`**

Add `onMultiplayer={() => {}}` to both `StartScreen` renders (alongside `onHowToPlay`), so typecheck passes.

- [ ] **Step 7: Wire mode + deep link into `src/App.tsx`**

Add near the top of the component:
```tsx
  const initialCode = (() => {
    const m = window.location.pathname.match(/^\/r\/([A-Za-z]{4})$/);
    return m ? m[1].toUpperCase() : undefined;
  })();
  const [mode, setMode] = useState<'single' | 'multi'>(initialCode ? 'multi' : 'single');
  const serverUrl = import.meta.env.VITE_MP_SERVER_URL ?? 'ws://localhost:8080';
```
Wrap the existing single-player markup so it only renders when `mode === 'single'`, pass `onMultiplayer={() => setMode('multi')}` to `StartScreen`, and render the container when in multi mode:
```tsx
      {mode === 'multi' && (
        <MultiplayerApp serverUrl={serverUrl} initialCode={initialCode} onExit={() => setMode('single')} />
      )}
```
Import `MultiplayerApp` and `useState` (already imported). Keep `useGame`/SP effects as-is (idle on the start screen).

- [ ] **Step 8: Add MP styles to `src/index.css`**

Append:
```css
/* -------------------------------------------------------------------------
   Multiplayer
   ---------------------------------------------------------------------- */
.mp-app { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
.mp-field { display: flex; flex-direction: column; gap: 0.3rem; text-align: left; font-size: 0.9rem; color: var(--text-muted); width: 100%; }
.mp-field input { font: inherit; padding: 0.55rem 0.7rem; border-radius: var(--radius-sm); border: 1px solid var(--surface-border); background: var(--surface); color: var(--text); text-transform: none; }
.mp-join-divider { height: 1px; width: 100%; background: var(--surface-border); margin: 0.25rem 0; }
.mp-error, .mp-reconnect { color: var(--red); font-weight: 600; margin: 0; }
.mp-room-code strong { font-family: var(--font-display); font-size: 1.6rem; letter-spacing: 0.15em; }
.mp-share { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
.mp-share-link { display: block; word-break: break-all; background: var(--card-bg-2); color: var(--text); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.85rem; }
.mp-roster, .mp-scoreboard, .mp-final-scores { list-style: none; margin: 0; padding: 0; width: 100%; }
.mp-roster li { padding: 0.3rem 0; border-bottom: 1px solid var(--surface-border); }
.mp-tag { color: var(--text-soft); font-size: 0.8rem; }
.mp-tag-off, .mp-off { opacity: 0.55; }
.mp-waiting { color: var(--text-muted); font-style: italic; margin: 0; }
.mp-play { display: flex; gap: 1rem; align-items: flex-start; width: 100%; }
.mp-play .board { flex: 1 1 auto; }
.mp-scoreboard { flex: 0 0 12rem; }
.mp-scoreboard li { display: flex; justify-content: space-between; padding: 0.4rem 0.7rem; background: var(--surface); border: 1px solid var(--surface-border); border-radius: 999px; margin-bottom: 0.4rem; }
.mp-board-wrap { position: relative; flex: 1 1 auto; }
.mp-board-wrap.mp-wrong { animation: shake 0.4s var(--ease-out); }
.mp-lockout { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 2rem; font-weight: 800; color: #fff; background: rgba(200, 40, 63, 0.45); border-radius: var(--radius-lg); backdrop-filter: blur(2px); }
.mp-final-scores li { display: flex; justify-content: space-between; padding: 0.4rem 0.7rem; }
.mp-final-scores .mp-winner { color: var(--gold); font-weight: 700; }
.mp-status { text-align: center; }
@media (max-width: 40rem) { .mp-play { flex-direction: column; } .mp-scoreboard { flex-basis: auto; width: 100%; } }
```

- [ ] **Step 9: Run MP results test + full verification**

Run: `npx vitest run src/components/mp/MpResults.test.tsx && npm run typecheck && npm test && npm run build`
Expected: MpResults tests pass; typecheck clean; **all** client + server tests pass; build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/components/mp/MpResults.tsx src/components/mp/MpResults.test.tsx src/components/mp/MultiplayerApp.tsx src/components/StartScreen.tsx src/components/Screens.test.tsx src/App.tsx src/index.css
git commit -m "feat(mp): results, container, app wiring, and multiplayer styles"
```

---

## Task 7: Manual smoke test (two browsers)

**Files:** none.

- [ ] **Step 1:** Start the server: `npm run server`.
- [ ] **Step 2:** Start the client: `npm run dev`. Open two browser windows at the dev URL.
- [ ] **Step 3:** Window A → Multiplayer → enter name → Create room. Copy the code.
- [ ] **Step 4:** Window B → Multiplayer → enter name → enter code → Join. Confirm both appear in each lobby.
- [ ] **Step 5:** Host starts. Confirm both see the **same board**. In A, claim a valid Set → it disappears in **both** windows and A's score increments.
- [ ] **Step 6:** In B, claim a non-Set → B sees a ~5s lockout overlay; A can still play.
- [ ] **Step 7:** Play to deck-clear → both see results + winner. Host clicks Rematch → new board for both.
- [ ] **Step 8:** Switch language to 中 mid-lobby → confirm MP UI is localized.

Report any discrepancy; otherwise the feature is functionally verified end-to-end.

---

## Self-Review

**1. Spec coverage (client portions):**
- Mode select + untouched SP → Task 6. ✓
- `/r/CODE` deep link (no router lib) → Task 6. ✓
- Socket wrapper + hook + reconnect/rejoin token → Tasks 2–3. ✓
- Join/Lobby with share link + host start → Task 4. ✓
- Shared board reusing `Card`, local 3-card selection → claim, lockout overlay, wrong flash → Tasks 5–6. ✓
- Live scoreboard → Task 5. ✓
- Results + rematch + draw handling → Task 6. ✓
- Full bilingual strings (en/zh) → Task 1. ✓
- Connection states (waking/reconnecting) → Task 6. ✓
- Env var `VITE_MP_SERVER_URL` → Tasks 1, 6. ✓
- Tests: socket, hook (incl. auto-rejoin), lobby, board, scoreboard, results → Tasks 2–6. ✓

**2. Placeholder scan:** No TBD/TODO. Error-code→string mapping is concrete (`ERR_KEY`). All component code is complete.

**3. Type consistency:** `Mp` view shape from Task 3 is consumed unchanged by `MultiplayerApp` (Task 6); `PlayerView`/`ScoreEntry`/`Card` come from the Part-1 protocol; `onClaim(ids: [string,string,string])`, `MpJoin`/`Lobby`/`Scoreboard`/`MpBoard`/`MpResults` prop names match their call sites. `StartScreen` gains `onMultiplayer` and its test is updated in the same task. ✓

**Deploy note:** After merging both parts and creating the Render web service, set `VITE_MP_SERVER_URL` (the server's `wss://…onrender.com` URL) on the static-site service and redeploy so production multiplayer connects.
