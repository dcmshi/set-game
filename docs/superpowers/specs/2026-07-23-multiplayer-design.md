# Set — Real-Time Multiplayer (Shared-Board Live Race)

**Status:** Approved design
**Date:** 2026-07-23

## 1. Goal

Add an online **multiplayer mode** to the existing single-player Set game: several
players (up to ~12) share **one live board** and race to claim Sets. The first
player to select a valid Set claims it; the cards are removed for everyone and the
board refills. Highest score when the deck is cleared wins.

Single-player stays exactly as it is; multiplayer is a **new, additive mode**
selected from the home screen.

Non-goals for v1: accounts/login, public quick-match/matchmaking, spectator chat,
persistent stats/leaderboards, anti-cheat hardening, mobile-native apps.

## 2. Experience summary

- A player picks **Multiplayer**, enters a display name, and **creates a room** or
  **joins** one with a short code / shared link (`/r/ABCD`).
- The room **lobby** lists connected players; the host **starts** the match.
- Everyone sees the **same board** update in real time. Claiming a valid Set scores
  **+1**; an invalid claim **locks that player out for 5 seconds** (others keep
  playing). No hints in multiplayer.
- When the deck is exhausted and no Set remains, a **results** screen shows the
  final scoreboard and winner, with a **rematch** option that re-deals in the same
  room.

## 3. Architecture

**Authoritative server.** One Node service owns the canonical game state (deck,
board, scores, per-player lockouts). Clients are thin: they render server-pushed
state and send **intents** (`claim [3 card ids]`). The server validates every
claim and is the single source of truth.

Why authoritative (not host-is-authority peer, not a SaaS): no client can forge
state or break the game by leaving; and it keeps everything on existing Render
infra with **no new external vendor** (per org policy, a new realtime SaaS would
require Fellow Security approval — explicitly avoided here).

**Atomic claims for free.** Node's single-threaded event loop processes each
WebSocket message to completion before the next. So "first valid claim wins" needs
no locks: the first `claim` mutates the board; the next `claim` for the same cards
sees them gone and returns `taken`. This also makes the race tests deterministic.

**Transport:** WebSocket (`ws`), JSON messages.

### 3.1 Repository layout

The pure game core (`src/game/cards.ts`, `src/game/set.ts`) is already
environment-agnostic. **The server imports these two modules directly from their
current location** — no client refactor, no `shared/` move (a deliberate
low-churn choice for v1; hoisting to a `shared/` package later is a clean, separate
refactor). Protocol message types live in `src/mp/protocol.ts` and are likewise
imported by the server.

```
repo/
  src/                     ← existing client (Vite/React)
    game/                  ← cards.ts, set.ts reused by the server (pure)
    mp/                    ← NEW client multiplayer code
      protocol.ts          ← message type definitions (imported by server too)
      socket.ts            ← thin WebSocket wrapper (connect/send/onMessage/reconnect)
      useMultiplayer.ts    ← hook: owns connection + room/game state, exposes actions
    components/mp/         ← NEW multiplayer UI (Lobby, Scoreboard, LockoutOverlay, MpResults)
  server/                  ← NEW Node + ws + TypeScript authoritative server
    package.json
    tsconfig.json          ← includes ../src/game/{cards,set}.ts and ../src/mp/protocol.ts
    src/
      index.ts             ← http + ws bootstrap, connection/message dispatch
      rooms.ts             ← RoomManager: codes, create/join/rejoin, TTL cleanup
      game.ts              ← authoritative match: deal/refill/claim/score/end
      *.test.ts
  render.yaml              ← add a second Render service (web) for the server
```

### 3.2 Deployment (Render)

- Existing **static site** service stays.
- Add a **web service** (Node) for the socket server.
- Client reads the server URL from a build-time env var **`VITE_MP_SERVER_URL`**
  (e.g. `wss://set-mp.onrender.com`); falls back to `ws://localhost:8080` in dev.
- Add an SPA rewrite so deep links (`/r/*`) serve `index.html`.
- **Known caveat:** Render free-tier web services **cold-start** after idle
  (~30–60 s first-connect delay). Acceptable for play-with-friends; documented in
  the UI as a "waking up server…" state.

## 4. Message protocol (`src/mp/protocol.ts`)

All messages are `{ type, ...payload }`. Types are exhaustive discriminated unions
so both ends stay in sync at compile time.

### Client → server
| type | payload | meaning |
|------|---------|---------|
| `createRoom` | `{ name }` | make a room, become host |
| `joinRoom` | `{ code, name }` | join an existing room's lobby |
| `rejoin` | `{ code, token }` | reconnect to a prior seat (see §6.3) |
| `startGame` | `{}` | host only; begins the match |
| `claim` | `{ cardIds: [string,string,string] }` | attempt to take a Set |
| `rematch` | `{}` | host only; re-deal in the same room |
| `leave` | `{}` | leave the room |

### Server → client
| type | payload | meaning |
|------|---------|---------|
| `joined` | `{ code, you:{id,token}, phase }` | ack join/create; token for reconnect |
| `roomState` | `{ code, phase, players:[{id,name,score,connected,spectator}], hostId }` | lobby/roster changes |
| `gameState` | `{ board:Card[], scores:{[id]:number}, deckCount, startedAt, yourLockoutUntil }` | full board + scores on every change |
| `claimResult` | `{ result:'ok'\|'invalid'\|'taken', lockoutUntil? }` | outcome of your claim |
| `gameOver` | `{ finalScores:[{id,name,score}], winnerIds:string[], durationMs }` | match ended |
| `error` | `{ code, message }` | bad request / room full / not host / etc. |

Notes:
- `phase` ∈ `'lobby' | 'playing' | 'results'`.
- Full `board` is broadcast (clients must render it) — see §7 limitation.
- `yourLockoutUntil` / `lockoutUntil` are server epoch ms; the client shows a
  countdown until then.

## 5. Server game rules (`server/src/game.ts`, reusing `src/game/set.ts` + `cards.ts`)

- **Deal:** shuffle the 81-card deck (`generateDeck` + `shuffle` + `makeRng`, seeded
  with a per-match random seed; seed is injectable for tests). Deal 12 face-up;
  if no Set is present, deal 3 more (15, 18, …) until a Set exists — reusing
  `boardHasSet` / `findAnySet`. Same guarantee as single-player.
- **Claim** `(playerId, cardIds)`:
  1. Reject if player is currently locked out (`now < lockoutUntil`) → `invalid`
     (no double penalty; just rejected).
  2. If any id is no longer on the board → `taken` (someone beat them; no penalty).
  3. If the three form a valid Set (`isSet`) → **accept**: score += 1, remove the 3
     cards, refill toward 12 from the deck (or shrink back toward 12 if the board had
     been expanded to 15/18), re-ensure a Set exists, broadcast `gameState`.
  4. Otherwise (on-board but not a Set) → set `lockoutUntil = now + 5000`, return
     `invalid` with `lockoutUntil`. Broadcast so others see the lockout on the
     scoreboard.
- **No hints** in multiplayer.
- **End:** deck empty **and** no Set on the board → phase `results`; `winnerIds` =
  all players tied for the top score (draw = co-winners in v1). `durationMs` from
  match start.

Tunable constants (one place, e.g. `server/src/game.ts`): `LOCKOUT_MS = 5000`,
`BOARD_TARGET = 12`, `DEAL_STEP = 3`, `MAX_PLAYERS = 12`.

## 6. Rooms & lifecycle (`server/src/rooms.ts`)

### 6.1 Codes & creation
- Room code: **4 uppercase letters** from a safe alphabet (no ambiguous
  `I/O`), regenerated on collision. Deep link: `/r/<CODE>`.
- Creator becomes **host**. `MAX_PLAYERS = 12`; join beyond that → `error{code:'full'}`.

### 6.2 Phases
`lobby` → (`startGame`, host) → `playing` → (deck cleared) → `results` →
(`rematch`, host) → `playing` again (scores reset, new deal).

- Room **locks at `startGame`**: `joinRoom` during `playing` returns the player as a
  **spectator** (in roster with `spectator:true`, no score, cannot `claim`); they are
  promoted to a player (`spectator:false`) at the next `rematch`/round.
- **Host leaves:** promote the longest-connected remaining player to host. If the
  room empties, delete it after a **TTL** (e.g. 60 s) grace window.

### 6.3 Disconnect / reconnect
- On socket close, mark the player `connected:false` but keep their seat and score;
  the match continues. Their claimed cards stay claimed.
- The client persists `{ code, playerId, token }` in `localStorage`. On reload or
  socket drop it sends `rejoin{code, token}`; the server matches the token to the
  seat and flips `connected:true`. Invalid token / missing room → fall back to a
  fresh `joinRoom`.
- Best-effort: reconnection within the room TTL; after the room is GC'd, the seat is
  gone.

## 7. Client (`src/mp/*`, `src/components/mp/*`)

- **Mode selection:** the home screen gains **Single Player / Multiplayer**. App
  gains a top-level mode (`'menu' | 'single' | 'multi'`). SP path is unchanged.
- **Routing (minimal, no router lib):** on load, parse `window.location.pathname`
  for `/r/<CODE>`; if present, jump straight to the join-name prompt for that room.
  Otherwise the menu. `history.pushState` updates the URL to `/r/<CODE>` on
  create/join so the link is shareable.
- **`useMultiplayer` hook:** wraps `socket.ts`, holds `{ phase, room, game, you,
  lockoutUntil, error }`, exposes `createRoom/join/start/claim/rematch/leave`.
  Auto-reconnect with `rejoin` on drop.
- **Screens/components:**
  - `Lobby` — room code + copyable share link, player list, host's Start button.
  - **Board** — reuses existing `Board`/`Card`/`CardFace`. Selecting 3 cards sends
    `claim`; selection is optimistic-cleared on `claimResult`.
  - `Scoreboard` — live per-player scores, connected/lockout/spectator indicators.
  - `LockoutOverlay` — a countdown veil over your board while `now < lockoutUntil`.
  - `MpResults` — final scoreboard, winner(s), Rematch (host) / Leave.
  - Connection states: "waking up server…" (cold start), "reconnecting…", "server
    unavailable" with retry.
- **i18n:** reuses the shipped `useT` layer; **all new strings added to the `en`
  and `zh` dictionaries**, so multiplayer is bilingual. Card aria-labels already
  localize via `cardAriaLabel`.

## 8. Testing

**Server (the core — `server/src/*.test.ts`, vitest):**
- `game.test.ts`: seeded deal always contains a Set; valid claim scores + removes +
  refills; **race resolution** — two `claim`s for the same Set, exactly one `ok`,
  the other `taken`; invalid claim sets a 5 s lockout and a locked player's claim is
  rejected; end/win detection incl. a **tie → multiple `winnerIds`**; board
  expands to 15 when needed and shrinks back.
- `rooms.test.ts`: code generation/uniqueness; join cap (13th → `full`); host
  promotion on host leave; TTL cleanup of empty rooms; **rejoin by token** restores
  the seat + score; spectator join during `playing` cannot `claim`.
- `protocol.test.ts` / an in-memory harness: each client message produces the right
  server message(s); malformed input yields `error`, never a crash.

**Client (`src/**/*.test.tsx`, jsdom):**
- `useMultiplayer` against a **mock socket**: state transitions for join → lobby →
  playing → results; `claim` clears selection on result; auto-`rejoin` on drop.
- Component tests: Lobby renders roster + share link; Scoreboard reflects scores +
  lockout; LockoutOverlay shows/hides on `lockoutUntil`; MpResults shows winner.

**Integration (light):** spin up the real server in-process on an ephemeral port,
connect two `ws` clients, play a scripted race, assert exactly one wins the contested
Set and the final scoreboard is consistent.

## 9. Known limitations (v1, accepted)

- Clients receive the full board, so a determined user could script optimal play.
  Acceptable for a play-with-friends game; not hardened in v1.
- Render free-tier cold starts (§3.2).
- No accounts: identity is an ephemeral name + reconnect token; clearing storage or
  room GC loses the seat.
- Ties resolve as co-winners (no sudden-death) in v1.

## 10. Scope & phasing

One cohesive subsystem → one spec, but a sizeable plan. Natural build order (each
independently testable), to be detailed by the implementation plan:

1. **Shared protocol types** (`src/mp/protocol.ts`).
2. **Server game core** (`server/src/game.ts`) — pure logic + tests (no sockets).
3. **Rooms/lifecycle** (`server/src/rooms.ts`) — pure logic + tests.
4. **Socket server** (`server/src/index.ts`) — wiring + in-process integration test.
5. **Client socket + hook** (`src/mp/socket.ts`, `useMultiplayer.ts`).
6. **Client screens** (menu, lobby, MP board, scoreboard, lockout, results) + i18n.
7. **Deploy config** (`render.yaml` web service, SPA rewrite, `VITE_MP_SERVER_URL`).

## 11. Deployment note

Work stays on branch `feature/multiplayer`. Pushing `main` ships the **client** to
Render prod; the **server** is a separate Render web service that must be created
and its URL wired into `VITE_MP_SERVER_URL` before multiplayer works in prod.
`npm run typecheck`, all tests (client + server), and `npm run build` must pass
before any merge to `main`.
