# Set — Single-Player Clear-the-Deck Race

**Status:** Approved design
**Date:** 2026-07-22

## 1. Concept

A timed solitaire version of the classic card game **Set**. The player races to
clear the entire 81-card deck by finding every valid Set as fast as possible.
The score is time-to-finish plus penalties; the goal is to beat your own local
best time.

Ships as a **static, client-side React site** deployed on Render. No backend, no
accounts, no data leaves the browser.

## 2. Rules as implemented

### The deck
All 81 cards — every combination of four features, each with three values:

| Feature | Values |
|---------|--------|
| Count   | 1, 2, 3 |
| Shape   | diamond, squiggle, oval |
| Shading | solid, striped, open |
| Color   | red, green, purple |

A **Set** is three cards where, for each of the four features, the values are
either all the same or all different.

### Board and flow
- Deal **12** cards face-up.
- **The board is always guaranteed to contain at least one Set.** After any
  removal, if the visible cards contain no Set, the game automatically deals 3
  more (15, 18, …) until a Set exists or the deck is empty. Set theory
  guarantees this never requires more than 21 cards on the table (the maximum
  Set-free collection is 20 cards). There is no manual "no Set here" button — the
  flow just works.
- **Selecting a valid Set:** the three cards flash green and are removed. The
  board refills toward 12 from the deck; if extra cards had been dealt (15/18),
  it shrinks back toward 12 instead of refilling.
- **Wrong guess:** three non-Set cards flash red, deselect, and **+5 seconds** is
  added to the clock. *(penalty value is a tunable constant)*
- **Hint:** a button highlights the three cards of one valid Set on the board.
  Each use adds **+15 seconds**. *(tunable constant)*
- **Win condition:** the deck is empty **and** no Set remains on the board. The
  win screen shows the final time (including penalties) and the best time, and
  celebrates a new record.

## 3. Architecture

Entirely client-side. React + Vite + TypeScript.

```
src/
  game/        pure TypeScript engine, zero React (fully unit-tested)
     cards.ts       Card type, full-deck generation, shuffle
     set.ts         isSet(), findAnySet(), boardHasSet()
     engine.ts      state transitions: deal, select, validate, refill,
                    auto-deal-when-no-Set, win check
  state/       useReducer hook wrapping the engine (React holds state,
               dispatches actions; engine stays pure)
  components/  Board, Card (SVG), Timer, Hud, StartScreen, WinModal
  storage/     localStorage wrapper for best time
  App.tsx      screen routing (start / playing / won)
```

Keeping the engine as **pure functions** means the tricky logic is testable
without a browser and the UI stays thin. The reducer translates user actions
into engine calls and holds the resulting immutable state.

## 4. Core logic

- **`isSet(a, b, c)`** — encode each feature value as 0/1/2. The three cards form
  a Set if and only if, for every feature, the sum of the three encoded values is
  divisible by 3. Exhaustively testable: the full 81-card deck contains exactly
  **1080** valid Sets.
- **`findAnySet(cards)`** — brute-force over 3-combinations. The board holds at
  most 21 cards, so this is trivially fast. It powers both the hint feature and
  the "does a Set exist on the board?" check that drives auto-dealing.
- **`boardHasSet(cards)`** — `findAnySet(cards) !== null`.

## 5. Data model

```ts
type Count   = 1 | 2 | 3;
type Shape   = 'diamond' | 'squiggle' | 'oval';
type Shading = 'solid' | 'striped' | 'open';
type Color   = 'red' | 'green' | 'purple';

interface Card {
  id: string;          // stable, e.g. "2-squiggle-striped-red"
  count: Count;
  shape: Shape;
  shading: Shading;
  color: Color;
}

interface GameState {
  deck: Card[];          // remaining, draw order
  board: Card[];         // face-up cards
  selected: string[];    // selected card ids (max 3)
  status: 'start' | 'playing' | 'won';
  startedAt: number;     // ms timestamp
  penaltyMs: number;     // accumulated penalties
  mistakes: number;
  hintsUsed: number;
  hintedIds: string[];   // currently highlighted hint cards
  bestMs: number | null; // from localStorage
}
```

## 6. Card rendering (native SVG)

Cards are drawn natively with SVG — no external image assets. This matches the
classic Set aesthetic, scales crisply, recolors freely, animates well, loads
instantly, and avoids redistributing the copyrighted official artwork.

- Each card draws its `count` (1–3) copies of the shape.
- **Shapes** are SVG paths: diamond (rhombus), oval (stadium/pill), and squiggle
  (the iconic wavy form as a closed bezier path).
- **Shading:** `solid` = filled; `open` = stroke only, no fill; `striped` = filled
  with an SVG line `<pattern>` in the card's color.
- **Colors:** red, green, purple (from the design palette).
- **Visual states:** selected (ring), correct (green flash), wrong (red flash),
  hinted (glow).
- **Accessibility:** each card has an aria-label (e.g. "two striped red
  diamonds") and is keyboard-selectable.

## 7. Screens and real-time feel

- **Start screen:** title, short how-to, best time, Start button.
- **Game screen:** live `mm:ss.d` timer at the top; responsive CSS-grid board in
  the center; HUD showing deck-cards-remaining, a Hint button, and the mistake
  count. Penalties show a floating "+5s" / "+15s" animation. Cards animate on
  deal and removal.
- **Timer pauses when the tab is hidden** (via the visibility API) so switching
  away doesn't unfairly inflate the race time.
- **Win modal:** final time, best time, a "New record!" badge when beaten, and a
  Play Again button.

## 8. Persistence

A single `localStorage` entry stores the best time in milliseconds. It is written
on a win only when the new time is faster, and read on the start and win screens.
Nothing else is stored and nothing leaves the browser.

## 9. Testing (TDD)

Engine logic is built test-first with Vitest.

- **Engine tests:**
  - the generated deck has exactly 81 unique cards;
  - `isSet` correctness, including an exhaustive check that the deck yields
    exactly 1080 Sets;
  - `findAnySet` finds a Set when one exists and returns null otherwise;
  - board transitions: valid-Set removal + refill, auto-deal when no Set exists,
    board never exceeds 21;
  - win detection (deck empty and no Set on board).
- **UI tests (React Testing Library):** select → validate flow, +5s penalty on a
  wrong guess, hint highlighting and its +15s penalty, best-time save on win.

## 10. Edge cases

- **Deck exhausts mid-game:** the board shrinks below 12 and play continues until
  no Set remains; that triggers the win.
- **No Set on a fresh 12:** auto-deal 3 (then 6, then 9…) until a Set appears;
  capped implicitly at 21 by Set theory.
- **Rapid / double clicks:** selecting a third card triggers validation
  atomically; extra clicks during the flash animation are ignored.
- **Deselection:** clicking a selected card deselects it.

## 11. Deployment (Render)

Deployed as a **Static Site** on Render.

- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback rewrite (all routes → `index.html`).
- A `render.yaml` is committed so the service is reproducible from the GitHub
  repo (`https://github.com/dcmshi/set-game.git`).
- This directory is initialized as a git repo and wired to the existing `origin`.

## 12. Out of scope (YAGNI)

- Multiplayer / real-time opponents.
- Accounts, global leaderboards, any backend or database.
- Sound effects (may revisit later).
- Alternate game modes (timed score-attack, daily puzzle) — the architecture
  keeps the engine pure so these could be added later without rework.
