# Multiplayer — Server & Protocol Implementation Plan (Part 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the authoritative real-time server for shared-board multiplayer Set: shared protocol types, a pure game engine (deal/claim/lockout/end), room lifecycle, and the WebSocket layer — fully tested, before any client work (Part 2).

**Architecture:** A Node + `ws` service in `server/`, run with `tsx` (no build step). It reuses the existing pure game core (`src/game/cards.ts`, `src/game/set.ts`) and shared protocol types (`src/mp/protocol.ts`) by importing them directly. Node's single-threaded loop makes claim resolution atomic. A single root `package.json` and root vitest run both client and server tests; server tests opt into the Node environment per-file.

**Tech Stack:** TypeScript, Node ≥20.19, `ws`, `tsx`, Vitest.

## Global Constraints

- **No new external SaaS vendor** — server runs on existing Render infra. `ws`/`tsx` are npm libraries, which is fine.
- **Reuse the pure core:** import `generateDeck`, `shuffle`, `makeRng`, `Card` from `../../src/game/cards`; `isSet`, `boardHasSet`, `findAnySet` from `../../src/game/set`. Do not duplicate Set logic.
- **Single root `package.json`.** Add `ws`, `tsx`, `@types/ws`, `@types/node`. No second `node_modules`.
- **Server tests declare** `// @vitest-environment node` on line 1 (the root Vitest env is jsdom).
- **Injectable clock:** all time-based logic takes a `now()` function so lockout/TTL tests are deterministic. Never call `Date.now()` directly in game/room logic.
- **Tunable constants** (in `server/src/game.ts`): `LOCKOUT_MS = 5000`, `BOARD_TARGET = 12`, `DEAL_STEP = 3`, `MAX_PLAYERS = 12`.
- **Port:** listen on `process.env.PORT ?? 8080`.
- **Branch:** `feature/multiplayer`. Do not merge/push to `main` (auto-deploys) until Part 2 is done and the human approves.
- **Commands:** `npx vitest run <path>` (single file), `npm test` (all), `npm run typecheck` (client + server).

---

## File Structure

**New**
- `src/mp/protocol.ts` — shared discriminated-union message types (imported by client & server).
- `server/tsconfig.json` — server typecheck config (Node types; includes the shared files).
- `server/src/game.ts` — `MpGame`: authoritative board/deck/scores/lockouts.
- `server/src/game.test.ts`
- `server/src/rooms.ts` — `Room` + `RoomManager`: codes, join/rejoin, host, spectators, TTL.
- `server/src/rooms.test.ts`
- `server/src/index.ts` — WebSocket bootstrap, message dispatch, broadcast.
- `server/src/integration.test.ts` — two real `ws` clients over an ephemeral port.

**Modified**
- `package.json` — deps + `server` / `server:dev` scripts; extend `typecheck`.
- `render.yaml` — add the server web service.

---

## Task 1: Scaffold — shared protocol + server toolchain

**Files:**
- Create: `src/mp/protocol.ts`, `server/tsconfig.json`
- Modify: `package.json`
- Test: `server/src/scaffold.test.ts` (temporary sanity test, deleted at end of task)

**Interfaces:**
- Produces: `Phase`, `PlayerView`, `ScoreEntry`, `ClientMessage`, `ServerMessage` from `src/mp/protocol.ts`.

- [ ] **Step 1: Add server dependencies and scripts to `package.json`**

Add to `dependencies`:
```json
    "ws": "^8.18.0",
    "tsx": "^4.19.2"
```
Add to `devDependencies`:
```json
    "@types/ws": "^8.5.13",
    "@types/node": "^22.10.0"
```
Replace the `typecheck` script and add server scripts:
```json
    "typecheck": "tsc --noEmit && tsc --noEmit -p server/tsconfig.json",
    "server": "tsx server/src/index.ts",
    "server:dev": "tsx watch server/src/index.ts",
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: installs `ws`, `tsx`, and the `@types`. No errors.

- [ ] **Step 3: Write `src/mp/protocol.ts`**

```ts
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
```

- [ ] **Step 4: Write `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["node"]
  },
  "include": ["src", "../src/game/cards.ts", "../src/game/set.ts", "../src/mp/protocol.ts"]
}
```

- [ ] **Step 5: Write a temporary sanity test `server/src/scaffold.test.ts`**

```ts
// @vitest-environment node
import type { ClientMessage } from '../../src/mp/protocol';
import { generateDeck } from '../../src/game/cards';

it('can import the shared protocol and game core from the server tree', () => {
  const msg: ClientMessage = { type: 'createRoom', name: 'A' };
  expect(msg.type).toBe('createRoom');
  expect(generateDeck()).toHaveLength(81);
});
```

- [ ] **Step 6: Run the sanity test + typecheck**

Run: `npx vitest run server/src/scaffold.test.ts && npm run typecheck`
Expected: test PASSES (confirms cross-tree imports + node env work); typecheck clean.

- [ ] **Step 7: Delete the temporary test and commit**

```bash
rm server/src/scaffold.test.ts
git add package.json package-lock.json src/mp/protocol.ts server/tsconfig.json
git commit -m "feat(mp): shared protocol types and server toolchain scaffold"
```

---

## Task 2: MpGame — deal & refill

**Files:**
- Create: `server/src/game.ts`
- Test: `server/src/game.test.ts`

**Interfaces:**
- Consumes: `generateDeck`, `shuffle`, `makeRng`, `Card` from `../../src/game/cards`; `isSet`, `boardHasSet` from `../../src/game/set`.
- Produces:
  - constants `LOCKOUT_MS`, `BOARD_TARGET`, `DEAL_STEP`, `MAX_PLAYERS`.
  - `class MpGame` with `constructor(now?: () => number)`, `deal(playerIds: string[], seed: number): void`, getters `board: Card[]`, `deckCount: number`, `scores: Record<string, number>`, `startedAt: number`, `over: boolean`, and `lockoutFor(id: string): number`.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
import { MpGame, BOARD_TARGET } from './game';
import { boardHasSet } from '../../src/game/set';

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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run server/src/game.test.ts`
Expected: FAIL — cannot find module `./game`.

- [ ] **Step 3: Implement `server/src/game.ts`**

```ts
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
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run server/src/game.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/game.ts server/src/game.test.ts
git commit -m "feat(mp): authoritative game deal and refill"
```

---

## Task 3: MpGame — claim, lockout, and end detection

**Files:**
- Modify: `server/src/game.ts`
- Test: `server/src/game.test.ts` (add cases)

**Interfaces:**
- Produces: `MpGame.claim(playerId: string, cardIds: [string, string, string]): ClaimResult`; `MpGame.winnerIds(): string[]` (all ids tied for max score).

- [ ] **Step 1: Add failing tests**

Append to `server/src/game.test.ts`:
```ts
import { findAnySet } from '../../src/game/set';
import { LOCKOUT_MS } from './game';

function firstSetIds(g: MpGame): [string, string, string] {
  const s = findAnySet(g.board)!;
  return [s[0].id, s[1].id, s[2].id];
}

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
  // Find three cards that are NOT a Set.
  const [a, b] = g.board;
  const c = g.board.find((x, i) => i > 1 && !isSet(a, b, x))!;
  const r = g.claim('p1', [a.id, b.id, c.id]);
  expect(r.result).toBe('invalid');
  expect(r.lockoutUntil).toBe(1000 + LOCKOUT_MS);
  expect(g.lockoutFor('p1')).toBe(1000 + LOCKOUT_MS);
  // A claim while locked out is rejected as invalid without extending the lock.
  t = 2000;
  const ids = firstSetIds(g);
  expect(g.claim('p1', ids).result).toBe('invalid');
  // After the lock expires, a valid claim works.
  t = 1000 + LOCKOUT_MS + 1;
  expect(g.claim('p1', firstSetIds(g)).result).toBe('ok');
});

it('treats duplicate card ids as an invalid claim (not a trivial Set)', () => {
  const g = new MpGame(() => 0);
  g.deal(['p1'], 42);
  const id = g.board[0].id;
  expect(g.claim('p1', [id, id, id]).result).toBe('invalid');
});

it('reports winners as all players tied for the top score', () => {
  const g = new MpGame();
  g.deal(['p1', 'p2', 'p3'], 42);
  // No claims yet → everyone tied at 0.
  expect(g.winnerIds().sort()).toEqual(['p1', 'p2', 'p3']);
});
```

- [ ] **Step 2: Run to verify the new cases fail**

Run: `npx vitest run server/src/game.test.ts`
Expected: FAIL — `claim`/`winnerIds` not defined.

- [ ] **Step 3: Implement — add methods to `MpGame` in `server/src/game.ts`**

Add inside the class (after `refill`):
```ts
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

  private lockout(playerId: string, now: number): ClaimResult {
    const until = now + LOCKOUT_MS;
    this.lockouts.set(playerId, until);
    return { result: 'invalid', lockoutUntil: until };
  }
```

- [ ] **Step 4: Run to verify all pass**

Run: `npx vitest run server/src/game.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/game.ts server/src/game.test.ts
git commit -m "feat(mp): claim resolution, lockout, and win detection"
```

---

## Task 4: Rooms & lifecycle

**Files:**
- Create: `server/src/rooms.ts`
- Test: `server/src/rooms.test.ts`

**Interfaces:**
- Consumes: `MpGame`, `MAX_PLAYERS` from `./game`; `PlayerView`, `ScoreEntry`, `Phase` from `../../src/mp/protocol`.
- Produces:
  - `interface Player { id: string; name: string; token: string; connected: boolean; spectator: boolean; joinedAt: number }`
  - `class Room` with: `code`, `phase: Phase`, `hostId: string`, `game: MpGame`; methods `addPlayer(name): Player`, `rejoin(token): Player | null`, `setConnected(id, connected): void`, `removePlayer(id): void`, `start(seed): void`, `claim(id, ids)`, `rematch(seed): void`, `roster(): PlayerView[]`, `gameStateFor(id)`, `results()`, `isEmpty(): boolean`, `activePlayerIds(): string[]`.
  - `class RoomManager` with: `constructor(now?: () => number)`, `create(name): { room, player }`, `join(code, name): { room, player } | { error }`, `rejoin(code, token)`, `get(code): Room | undefined`, `sweep(ttlMs): void`.
- Deterministic ids/tokens/codes for tests via an injectable generator; default uses `crypto.randomUUID` and random codes.

- [ ] **Step 1: Write the failing test**

```ts
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
  expect(r.result).toBe('taken'); // spectators are not scoring participants
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run server/src/rooms.test.ts`
Expected: FAIL — cannot find module `./rooms`.

- [ ] **Step 3: Implement `server/src/rooms.ts`**

```ts
import { MpGame, MAX_PLAYERS } from './game';
import type { PlayerView, ScoreEntry, Phase } from '../../src/mp/protocol';

export interface Player {
  id: string;
  name: string;
  token: string;
  connected: boolean;
  spectator: boolean;
  joinedAt: number;
}

type JoinOk = { room: Room; player: Player };
type JoinErr = { error: string };

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O

export interface IdGen {
  id(): string;
  token(): string;
  code(): string;
}

const defaultIdGen: IdGen = {
  id: () => crypto.randomUUID(),
  token: () => crypto.randomUUID(),
  code: () =>
    Array.from({ length: 4 }, () =>
      CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    ).join(''),
};

export class Room {
  phase: Phase = 'lobby';
  hostId = '';
  game: MpGame;
  lastActivity: number;

  private players = new Map<string, Player>();

  constructor(
    readonly code: string,
    private now: () => number,
    private gen: IdGen
  ) {
    this.game = new MpGame(now);
    this.lastActivity = now();
  }

  addPlayer(name: string): Player {
    const player: Player = {
      id: this.gen.id(),
      name,
      token: this.gen.token(),
      connected: true,
      spectator: this.phase === 'playing',
      joinedAt: this.now(),
    };
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    this.touch();
    return player;
  }

  rejoin(token: string): Player | null {
    const player = [...this.players.values()].find((p) => p.token === token);
    if (!player) return null;
    player.connected = true;
    this.touch();
    return player;
  }

  setConnected(id: string, connected: boolean): void {
    const p = this.players.get(id);
    if (p) p.connected = connected;
    this.touch();
  }

  removePlayer(id: string): void {
    const wasHost = this.hostId === id;
    this.players.delete(id);
    if (wasHost) {
      const next = [...this.players.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      this.hostId = next ? next.id : '';
    }
    this.touch();
  }

  activePlayerIds(): string[] {
    return [...this.players.values()].filter((p) => !p.spectator).map((p) => p.id);
  }

  start(seed: number): void {
    this.phase = 'playing';
    this.game.deal(this.activePlayerIds(), seed);
    this.touch();
  }

  rematch(seed: number): void {
    for (const p of this.players.values()) p.spectator = false;
    this.phase = 'playing';
    this.game.deal(this.activePlayerIds(), seed);
    this.touch();
  }

  claim(id: string, cardIds: [string, string, string]) {
    const p = this.players.get(id);
    this.touch();
    if (!p || p.spectator) return { result: 'taken' as const };
    const r = this.game.claim(id, cardIds);
    if (this.game.over) this.phase = 'results';
    return r;
  }

  roster(): PlayerView[] {
    const scores = this.game.scores;
    return [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      score: scores[p.id] ?? 0,
      connected: p.connected,
      spectator: p.spectator,
    }));
  }

  gameStateFor(id: string) {
    return {
      board: this.game.board,
      scores: this.game.scores,
      deckCount: this.game.deckCount,
      startedAt: this.game.startedAt,
      yourLockoutUntil: this.game.lockoutFor(id),
    };
  }

  results(): { finalScores: ScoreEntry[]; winnerIds: string[]; durationMs: number } {
    const scores = this.game.scores;
    const finalScores: ScoreEntry[] = [...this.players.values()]
      .filter((p) => !p.spectator)
      .map((p) => ({ id: p.id, name: p.name, score: scores[p.id] ?? 0 }))
      .sort((a, b) => b.score - a.score);
    return {
      finalScores,
      winnerIds: this.game.winnerIds(),
      durationMs: this.now() - this.game.startedAt,
    };
  }

  size(): number {
    return this.players.size;
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  private touch(): void {
    this.lastActivity = this.now();
  }
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(
    private now: () => number = () => Date.now(),
    private gen: IdGen = defaultIdGen
  ) {}

  create(name: string): JoinOk {
    let code = this.gen.code();
    while (this.rooms.has(code)) code = this.gen.code();
    const room = new Room(code, this.now, this.gen);
    this.rooms.set(code, room);
    const player = room.addPlayer(name);
    return { room, player };
  }

  join(code: string, name: string): JoinOk | JoinErr {
    const room = this.rooms.get(code);
    if (!room) return { error: 'not_found' };
    if (room.size() >= MAX_PLAYERS) return { error: 'full' };
    return { room, player: room.addPlayer(name) };
  }

  rejoin(code: string, token: string): JoinOk | JoinErr {
    const room = this.rooms.get(code);
    if (!room) return { error: 'not_found' };
    const player = room.rejoin(token);
    if (!player) return { error: 'no_seat' };
    return { room, player };
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  sweep(ttlMs: number): void {
    const now = this.now();
    for (const [code, room] of this.rooms) {
      if (room.isEmpty() && now - room.lastActivity >= ttlMs) this.rooms.delete(code);
    }
  }
}
```

- [ ] **Step 4: Run to verify all pass**

Run: `npx vitest run server/src/rooms.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/rooms.ts server/src/rooms.test.ts
git commit -m "feat(mp): room lifecycle, rejoin, spectators, host promotion, TTL"
```

---

## Task 5: WebSocket server + broadcast + integration test

**Files:**
- Create: `server/src/index.ts`, `server/src/integration.test.ts`

**Interfaces:**
- Consumes: `RoomManager`, `Room` from `./rooms`; `ClientMessage`, `ServerMessage` from `../../src/mp/protocol`; `WebSocketServer`, `WebSocket` from `ws`.
- Produces: `createServer(opts?: { port?: number; now?: () => number }): { wss: WebSocketServer; close(): Promise<void> }` — exported for tests; `index.ts` also self-starts when run directly.
- Behaviour: maps each socket to `{ roomCode, playerId }`; on every state change, broadcasts `roomState` (+ per-recipient `gameState`) to the room; sends `gameOver` when a claim ends the match; runs `sweep` on an interval.

- [ ] **Step 1: Write the failing integration test**

```ts
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

  // Find a real Set from the broadcast board.
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run server/src/integration.test.ts`
Expected: FAIL — cannot find module `./index`.

- [ ] **Step 3: Implement `server/src/index.ts`**

```ts
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
  const wss = new WebSocketServer({ port });
  const conns = new Map<WebSocket, Conn>();

  const send = (ws: WebSocket, msg: ServerMessage) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };

  const broadcast = (room: Room) => {
    for (const [ws, c] of conns) {
      if (c.roomCode !== room.code || !c.playerId) continue;
      send(ws, { type: 'roomState', code: room.code, phase: room.phase, players: room.roster(), hostId: room.hostId });
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
        if (!room || room.hostId !== c.playerId) return send(ws, { type: 'error', code: 'not_host', message: 'Only the host can start.' });
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
        if (!room || room.hostId !== c.playerId) return send(ws, { type: 'error', code: 'not_host', message: 'Only the host can rematch.' });
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
        wss.close(() => resolve());
      }),
  };
}

// Self-start when run directly (tsx server/src/index.ts).
if (process.env.VITEST === undefined) {
  createServer();
  // eslint-disable-next-line no-console
  console.log(`Set MP server listening on :${process.env.PORT ?? 8080}`);
}
```

- [ ] **Step 4: Run the integration test + typecheck**

Run: `npx vitest run server/src/integration.test.ts && npm run typecheck`
Expected: integration test PASSES (exactly one `ok`, one `taken`); typecheck clean. (The `VITEST` guard prevents the self-start block from opening a second port during tests.)

- [ ] **Step 5: Commit**

```bash
git add server/src/index.ts server/src/integration.test.ts
git commit -m "feat(mp): websocket server, broadcast, and two-client integration test"
```

---

## Task 6: Render deployment config

**Files:**
- Modify: `render.yaml`

No unit test — verified by `npm run server` starting locally and `npm run typecheck`.

- [ ] **Step 1: Add the server web service to `render.yaml`**

Append a second service (keep the existing static site):
```yaml
  - type: web
    name: set-mp-server
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npm run server
    envVars:
      - key: NODE_VERSION
        value: 20.19.0
```

> The static site build (Part 2) will read `VITE_MP_SERVER_URL`; that env var is added in Part 2 once the server's Render URL is known.

- [ ] **Step 2: Smoke-test the server locally**

Run: `npm run server` (in one shell), then in another: `node -e "const ws=new (require('ws'))('ws://localhost:8080'); ws.on('open',()=>{ws.send(JSON.stringify({type:'createRoom',name:'x'}))}); ws.on('message',d=>{console.log(d.toString()); process.exit(0)});"`
Expected: prints a `joined` message with a `code`. Stop the server (Ctrl-C).

- [ ] **Step 3: Full verification + commit**

Run: `npm run typecheck && npm test`
Expected: typecheck clean; all client + server tests pass.
```bash
git add render.yaml
git commit -m "chore(mp): add Render web service for the multiplayer server"
```

---

## Self-Review

**1. Spec coverage (server portions):**
- Authoritative server, WebSocket, atomic claims → Tasks 2–5. ✓
- Reuse pure core, protocol in `src/mp/protocol.ts` → Tasks 1–2. ✓
- Deal/refill guarantee, claim/lockout/taken/end, tie winners → Tasks 2–3. ✓
- Rooms: codes, join cap, spectators, host promotion, rejoin, TTL → Task 4. ✓
- Socket protocol messages both directions, broadcast, gameOver → Task 5. ✓
- Render web service, single-package toolchain → Tasks 1, 6. ✓
- Race resolution test, lockout timing, rejoin, integration → Tasks 3–5. ✓

**2. Placeholder scan:** No TBD/TODO. Constants defined in Task 2. `VITE_MP_SERVER_URL` is deferred to Part 2 (explicitly noted), not a placeholder here.

**3. Type consistency:** `MpGame.claim(id, [3])`/`ClaimResult`, `Room`/`RoomManager` method names, `Player` shape, and `createServer({port, now})` are used identically across Tasks 3–5. Protocol `PlayerView`/`ScoreEntry`/`ServerMessage` shapes match what `roster()`/`results()`/`gameStateFor()` produce. ✓

**Deliverable:** a fully tested authoritative server. Part 2 (client) builds the UI against this protocol.
