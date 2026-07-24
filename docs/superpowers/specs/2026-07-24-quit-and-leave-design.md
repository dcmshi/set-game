# Set — Quit / Leave Quality-of-Life

**Status:** Approved design
**Date:** 2026-07-24

## 1. Goal

Let players exit back to the **main (start) screen** from anywhere in the app,
with a **confirmation only when a game is actually in progress** — so an active
single-player or multiplayer game can't be thrown away by a stray click, while
places with nothing to lose (lobby, results, join) exit immediately. Covers both
single-player and multiplayer.

## 2. Behaviour

| Location | Control | Confirm? | Action |
|----------|---------|----------|--------|
| SP in-game (`playing`) | **Quit** button in the top bar | **Yes** | → start screen; no best time recorded (abandon, not a win) |
| SP win modal | *(existing Play Again)* | — | unchanged |
| MP **lobby** | **Leave** button | No | leave the room → main page |
| MP in-game (`playing`) | **Leave** button in the top bar | **Yes** | leave room (forfeit) → main page |
| MP results | *(existing Leave)* | No | unchanged |
| MP join (`none`) | *(existing ← Back)* | No | unchanged |

**Confirm dialog** (only for the two in-progress cases):
- Title: SP → "Quit game?"; MP → "Leave game?"
- Body: SP → "Your current game will be lost."; MP → "You'll leave the room and
  forfeit this game."
- Buttons: **confirm** ("Quit" for SP / "Leave" for MP) + **cancel** ("Keep playing").
- **Default focus is Cancel**, and Esc / backdrop-click / Cancel all dismiss — biased
  against accidental loss.

## 3. Components & changes

- **New `src/components/ConfirmDialog.tsx`** — a reusable overlay modal
  (`.modal-backdrop` + `role="dialog"` + `aria-modal`, like `WinModal`).
  Props: `{ title: string; body: string; confirmLabel: string; cancelLabel: string;
  onConfirm(): void; onCancel(): void; danger?: boolean }`. Focuses the cancel
  button on mount; `Esc` and backdrop click call `onCancel`.
- **`src/state/useGame.ts`** — add `quit(): void` to `UseGame`: sets `screen` back to
  `'start'` and clears the paused flag. It does **not** record a best time (abandon).
- **`src/App.tsx`** — single-player: a **Quit** button in the in-game
  `.topbar-actions`; local `confirmQuit` state; render `ConfirmDialog` when set;
  confirm → `g.quit()`.
- **`src/components/mp/MultiplayerApp.tsx`** — pass an `onLeave` to `Lobby`
  (immediate `leave()`); add a **Leave** button to the in-game top bar guarded by a
  local `confirmLeave` state + `ConfirmDialog`; confirm → `leave()` (which already
  sends `leave` to the server and returns to the menu via `onExit`).
- **`src/components/mp/Lobby.tsx`** — new required prop `onLeave(): void` + a Leave
  button (styled like the join screen's Back).
- **`src/i18n/strings.ts`** — new `en` + `zh` keys (§4).
- **`src/index.css`** — small additions: a `.confirm-dialog` layout and a
  `.danger-btn` (confirm-to-lose action); reuse `.modal-backdrop`, `.primary-btn`,
  `.text-btn`.

No server changes: a player leaving mid-match is already handled
(`removePlayer` / disconnect → others keep playing).

## 4. i18n keys (en / zh)

- `qol.quit` — "Quit" / "退出"  *(SP in-game button + SP confirm label)*
- `qol.quitTitle` — "Quit game?" / "退出游戏？"  *(SP)*
- `qol.leaveTitle` — "Leave game?" / "离开游戏？"  *(MP in-game)*
- `qol.quitBodySingle` — "Your current game will be lost." / "当前的游戏进度将会丢失。"
- `qol.quitBodyMulti` — "You'll leave the room and forfeit this game." / "你将离开房间并放弃本局游戏。"
- `qol.keepPlaying` — "Keep playing" / "继续游戏"
- Reuse existing **`mp.leave`** ("Leave" / "离开") for the MP lobby + in-game Leave
  buttons and the MP confirm label.

## 5. Testing

- **`ConfirmDialog.test.tsx`** — renders title/body/labels; clicking confirm fires
  `onConfirm`; clicking cancel and pressing `Esc` fire `onCancel`.
- **`Lobby.test.tsx`** — the new Leave button fires `onLeave` (extends the existing
  lobby test).
- **`App.test.tsx`** — SP quit flow: start a game → click Quit → **Keep playing**
  keeps you in the game (board still present) → click Quit → confirm → back on the
  start screen (Start button visible). Depends on `useGame.quit`.
- **MP in-game Leave** — reuses the tested `ConfirmDialog`; verified in a two-tab
  browser smoke check (open room, start, Leave → confirm → back to main; other tab
  keeps playing).

## 6. Non-goals / notes

- No confirmation on lobby / results / join exits (nothing in progress to lose).
- Quitting single-player forfeits the run — intentionally no best-time record.
- Deployment unchanged: work on `feature/quit-leave`; `npm run typecheck && npm test
  && npm run build` all green before merge to `main`.
