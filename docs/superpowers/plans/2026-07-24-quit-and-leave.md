# Quit / Leave Quality-of-Life — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players exit to the start screen from anywhere — a confirmation dialog only when a game is in progress (single-player or multiplayer); lobby/results/join exit immediately.

**Architecture:** One reusable `ConfirmDialog` overlay. Single-player gets a `quit()` on `useGame` (return to start, no best-time record) wired to a top-bar **Quit** button. Multiplayer gets a lobby **Leave** (immediate) and an in-game **Leave** (confirmed) reusing the existing `leave()`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library.

## Global Constraints

- **Reuse the i18n layer:** every new string goes in **both** `en` and `zh` in `src/i18n/strings.ts` (`strings.test.ts` enforces key parity).
- **Confirm dialog is cancel-biased:** default focus on Cancel; Esc + backdrop-click + Cancel all dismiss.
- **Quitting single-player does not record a best time** (abandon ≠ win).
- **No server changes** — a player leaving mid-match is already handled.
- **Branch:** `feature/quit-leave`. `npm run typecheck && npm test && npm run build` all green before merge. Do not push `main` (prod deploy — gated to the human).
- **Verify with the full CI sequence** (`typecheck && test && build`), not just Vitest, before claiming done.

---

## File Structure

**New**
- `src/components/ConfirmDialog.tsx` — reusable confirm overlay.
- `src/components/ConfirmDialog.test.tsx`

**Modified**
- `src/i18n/strings.ts` — `qol.*` keys (en + zh).
- `src/state/useGame.ts` — add `quit()`.
- `src/state/useGame.pause.test.tsx` — add a `quit` test.
- `src/App.tsx` — SP top-bar Quit button + confirm dialog.
- `src/App.test.tsx` — SP quit-flow test.
- `src/components/mp/MultiplayerApp.tsx` — lobby Leave + in-game Leave + confirm dialog.
- `src/components/mp/Lobby.tsx` — `onLeave` prop + Leave button.
- `src/components/mp/Lobby.test.tsx` — Leave button test + pass new prop.
- `src/index.css` — `.quit-btn`, `.confirm-dialog`, `.confirm-actions`, `.danger-btn`.

---

## Task 1: Strings + `useGame.quit`

**Files:**
- Modify: `src/i18n/strings.ts`, `src/state/useGame.ts`
- Test: `src/i18n/strings.test.ts` (existing, must stay green), `src/state/useGame.pause.test.tsx`

**Interfaces:**
- Produces: new `StringKey`s `qol.quit`, `qol.quitTitle`, `qol.leaveTitle`, `qol.quitBodySingle`, `qol.quitBodyMulti`, `qol.keepPlaying`; `UseGame.quit(): void`.

- [ ] **Step 1: Add the `qol.*` strings**

In `src/i18n/strings.ts`, add to the **`en`** object (before `} as const;`):
```ts
  'qol.quit': 'Quit',
  'qol.quitTitle': 'Quit game?',
  'qol.leaveTitle': 'Leave game?',
  'qol.quitBodySingle': 'Your current game will be lost.',
  'qol.quitBodyMulti': "You'll leave the room and forfeit this game.",
  'qol.keepPlaying': 'Keep playing',
```
Add the matching keys to **`zh`** (before its closing `};`):
```ts
  'qol.quit': '退出',
  'qol.quitTitle': '退出游戏？',
  'qol.leaveTitle': '离开游戏？',
  'qol.quitBodySingle': '当前的游戏进度将会丢失。',
  'qol.quitBodyMulti': '你将离开房间并放弃本局游戏。',
  'qol.keepPlaying': '继续游戏',
```

- [ ] **Step 2: Write the failing `quit` test**

Add to `src/state/useGame.pause.test.tsx`:
```tsx
it('quit returns to the start screen and records no best time', () => {
  const { result } = renderHook(() => useGame(1));
  act(() => { result.current.start(); });
  expect(result.current.screen).toBe('playing');
  act(() => { result.current.quit(); });
  expect(result.current.screen).toBe('start');
  expect(result.current.paused).toBe(false);
  expect(result.current.bestMs).toBeNull(); // abandon → nothing recorded
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/state/useGame.pause.test.tsx`
Expected: FAIL — `result.current.quit` is not a function.

- [ ] **Step 4: Implement `quit` in `src/state/useGame.ts`**

Add to the `UseGame` interface (after `resume: () => void;`):
```ts
  quit: () => void;
```
Add the callback near `pause`/`resume`:
```ts
  const quit = useCallback(() => {
    setPaused(false);
    setScreen('start');
  }, []);
```
Add `quit` to the returned object:
```ts
  return { screen, state, displayMs, bestMs, isRecord, start, select, hint, paused, pause, resume, quit };
```

- [ ] **Step 5: Run to verify pass + parity + typecheck**

Run: `npx vitest run src/state/useGame.pause.test.tsx src/i18n/strings.test.ts && npm run typecheck`
Expected: PASS; strings parity holds; typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/strings.ts src/state/useGame.ts src/state/useGame.pause.test.tsx
git commit -m "feat(qol): quit() on useGame and quit/leave strings"
```

---

## Task 2: ConfirmDialog

**Files:**
- Create: `src/components/ConfirmDialog.tsx`
- Test: `src/components/ConfirmDialog.test.tsx`

**Interfaces:**
- Produces: `ConfirmDialog({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel, danger? }: { title: string; body: string; confirmLabel: string; cancelLabel: string; onConfirm(): void; onCancel(): void; danger?: boolean })`.

- [ ] **Step 1: Write the failing test**

`src/components/ConfirmDialog.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

const base = {
  title: 'Quit game?',
  body: 'Your current game will be lost.',
  confirmLabel: 'Quit',
  cancelLabel: 'Keep playing',
};

it('renders title/body and fires onConfirm', async () => {
  const onConfirm = vi.fn();
  render(<ConfirmDialog {...base} onConfirm={onConfirm} onCancel={() => {}} />);
  expect(screen.getByRole('dialog', { name: /quit game/i })).toBeInTheDocument();
  expect(screen.getByText(/your current game will be lost/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Quit' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

it('cancels via the cancel button and Escape', async () => {
  const onCancel = vi.fn();
  render(<ConfirmDialog {...base} onConfirm={() => {}} onCancel={onCancel} />);
  await userEvent.click(screen.getByRole('button', { name: /keep playing/i }));
  await userEvent.keyboard('{Escape}');
  expect(onCancel).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/ConfirmDialog.test.tsx`
Expected: FAIL — cannot find module `./ConfirmDialog`.

- [ ] **Step 3: Implement `src/components/ConfirmDialog.tsx`**

```tsx
import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm(): void;
  onCancel(): void;
  danger?: boolean;
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger = true,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="screen confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="confirm-actions">
          <button type="button" className="text-btn" onClick={onCancel} ref={cancelRef}>
            {cancelLabel}
          </button>
          <button type="button" className={danger ? 'danger-btn' : 'primary-btn'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/ConfirmDialog.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ConfirmDialog.tsx src/components/ConfirmDialog.test.tsx
git commit -m "feat(qol): reusable ConfirmDialog overlay"
```

---

## Task 3: Single-player Quit wiring

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `ConfirmDialog` (Task 2); `useGame.quit` (Task 1).

- [ ] **Step 1: Write the failing test**

Add to `src/App.test.tsx` (uses the existing `within` import — add it):
```tsx
it('quits an in-progress single-player game only after confirming', async () => {
  render(<App seed={5} />);
  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  expect(screen.getByRole('timer')).toBeInTheDocument();

  // Open the confirm, then cancel — still in the game.
  await userEvent.click(screen.getByRole('button', { name: /quit/i }));
  await userEvent.click(screen.getByRole('button', { name: /keep playing/i }));
  expect(screen.getByRole('timer')).toBeInTheDocument();

  // Open again and confirm — back on the start screen.
  await userEvent.click(screen.getByRole('button', { name: /quit/i }));
  const dialog = screen.getByRole('dialog', { name: /quit game/i });
  await userEvent.click(within(dialog).getByRole('button', { name: /quit/i }));
  expect(screen.getByRole('button', { name: /^start$/i })).toBeInTheDocument();
});
```
Update the import line to include `within`:
```tsx
import { render, screen, waitFor, within } from '@testing-library/react';
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — no "Quit" button on the playing screen.

- [ ] **Step 3: Implement in `src/App.tsx`**

3a. Import ConfirmDialog (with the other component imports):
```tsx
import { ConfirmDialog } from './components/ConfirmDialog';
```
3b. Add state next to `howToOpen`:
```tsx
  const [confirmQuit, setConfirmQuit] = useState(false);
```
3c. In the `playing` top-bar `.topbar-actions`, add a Quit button **before** the `?` button:
```tsx
            <div className="topbar-actions">
              <button type="button" className="quit-btn" onClick={() => setConfirmQuit(true)}>
                {t('qol.quit')}
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('topbar.howToAria')}
                onClick={openHowTo}
              >
                ?
              </button>
              <LanguageToggle />
            </div>
```
3d. Add the dialog render just before the closing `</div>` of `.app` (after the `{howToOpen && …}` line):
```tsx
      {confirmQuit && (
        <ConfirmDialog
          title={t('qol.quitTitle')}
          body={t('qol.quitBodySingle')}
          confirmLabel={t('qol.quit')}
          cancelLabel={t('qol.keepPlaying')}
          onConfirm={() => {
            setConfirmQuit(false);
            g.quit();
          }}
          onCancel={() => setConfirmQuit(false)}
        />
      )}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (all App tests, including the new quit-flow one).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat(qol): single-player Quit button with confirmation"
```

---

## Task 4: Multiplayer Leave wiring

**Files:**
- Modify: `src/components/mp/Lobby.tsx`, `src/components/mp/MultiplayerApp.tsx`
- Test: `src/components/mp/Lobby.test.tsx`

**Interfaces:**
- Consumes: `ConfirmDialog` (Task 2).
- Produces: `Lobby` gains required prop `onLeave(): void`.

- [ ] **Step 1: Update the Lobby test (fails until Lobby changes)**

In `src/components/mp/Lobby.test.tsx`, add `onLeave={() => {}}` to **both** existing `Lobby` renders, and add a new test:
```tsx
it('fires onLeave when the leave button is clicked', async () => {
  const onLeave = vi.fn();
  renderWithI18n(
    <Lobby code="ABCD" players={players} hostId="p1" youId="p1" isHost onStart={() => {}} onLeave={onLeave} />
  );
  await userEvent.click(screen.getByRole('button', { name: /leave/i }));
  expect(onLeave).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/mp/Lobby.test.tsx`
Expected: FAIL — `Lobby` has no `onLeave` prop / no leave button.

- [ ] **Step 3: Add `onLeave` to `src/components/mp/Lobby.tsx`**

Add to `LobbyProps`:
```ts
  onLeave(): void;
```
Add `onLeave` to the destructured params, and add a Leave button as the last child (after the host/waiting block):
```tsx
      <button type="button" className="text-btn" onClick={onLeave}>
        {t('mp.leave')}
      </button>
```

- [ ] **Step 4: Wire `src/components/mp/MultiplayerApp.tsx`**

4a. Import ConfirmDialog:
```tsx
import { ConfirmDialog } from '../ConfirmDialog';
```
4b. Add state after `wrongFlash`:
```tsx
  const [confirmLeave, setConfirmLeave] = useState(false);
```
4c. Pass `onLeave` to the lobby `Lobby` element:
```tsx
          onStart={mp.start}
          onLeave={leave}
```
4d. In the `playing` branch, replace the `<header className="topbar">` block so it includes a Leave button:
```tsx
          <header className="topbar">
            <Timer ms={Math.max(0, Date.now() - mp.startedAt)} />
            <div className="topbar-actions">
              <button type="button" className="quit-btn" onClick={() => setConfirmLeave(true)}>
                {t('mp.leave')}
              </button>
            </div>
          </header>
```
4e. Add the dialog render just before the final `</div>` of `.mp-app`:
```tsx
      {confirmLeave && (
        <ConfirmDialog
          title={t('qol.leaveTitle')}
          body={t('qol.quitBodyMulti')}
          confirmLabel={t('mp.leave')}
          cancelLabel={t('qol.keepPlaying')}
          onConfirm={() => {
            setConfirmLeave(false);
            leave();
          }}
          onCancel={() => setConfirmLeave(false)}
        />
      )}
```

- [ ] **Step 5: Run to verify pass + typecheck**

Run: `npx vitest run src/components/mp/Lobby.test.tsx && npm run typecheck`
Expected: PASS (3 lobby tests); typecheck clean (confirms MultiplayerApp compiles).

- [ ] **Step 6: Commit**

```bash
git add src/components/mp/Lobby.tsx src/components/mp/Lobby.test.tsx src/components/mp/MultiplayerApp.tsx
git commit -m "feat(qol): multiplayer lobby Leave and in-game Leave with confirmation"
```

---

## Task 5: Styles + full verification

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Append styles to `src/index.css`**

```css
/* -------------------------------------------------------------------------
   Quit / Leave — top-bar button and confirm dialog
   ---------------------------------------------------------------------- */
.quit-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--surface-border);
  background: var(--surface);
  color: var(--text-muted);
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px var(--surface-shadow);
  transition: color var(--dur-fast), transform var(--dur-fast) var(--ease-out);
}
.quit-btn:hover {
  color: var(--red);
  transform: translateY(-1px);
}
.confirm-dialog {
  max-width: 24rem;
  gap: 0.75rem;
}
.confirm-dialog p {
  margin: 0;
  color: var(--text-muted);
}
.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}
.danger-btn {
  font-size: 1.05rem;
  font-weight: 600;
  padding: 0.8rem 2rem;
  border: none;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--red), #9e1f30);
  color: #fff;
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out), filter var(--dur-fast);
}
.danger-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}
```

- [ ] **Step 2: Full verification (the CI sequence)**

Run: `npm run typecheck && npm test && npm run build`
Expected: typecheck clean; **all** tests pass; build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style(qol): quit button and confirm dialog"
```

- [ ] **Step 4: Manual smoke (optional but recommended)**

`npm run server` + `npm run dev`, then:
- Single-player: Start → **Quit** → *Keep playing* stays; Quit → confirm → back to start.
- Multiplayer: create room → **Leave** in lobby returns to main immediately; start a game → **Leave** → confirm → back to main (second tab keeps playing).
- Toggle to 中 and confirm the dialog + buttons are localized.

---

## Self-Review

**1. Spec coverage:**
- SP in-game Quit + confirm + no best-time → Tasks 1, 3. ✓
- MP lobby Leave (immediate) → Task 4. ✓
- MP in-game Leave + confirm → Task 4. ✓
- Reusable cancel-biased ConfirmDialog (Esc/backdrop) → Task 2. ✓
- Per-mode dialog titles, bilingual strings → Task 1. ✓
- Tests: ConfirmDialog, Lobby Leave, SP quit flow → Tasks 2, 3, 4. ✓
- Styles → Task 5. ✓

**2. Placeholder scan:** None. All code complete.

**3. Type consistency:** `quit()` added to `UseGame` and used in App; `ConfirmDialog` prop names match all three call sites (SP + MP dialog + tests); `Lobby` gains `onLeave` consistently in component, both existing renders, and the new test. `qol.*` keys defined in Task 1 are the exact keys referenced in Tasks 3–4.

**Note:** `MultiplayerApp` has no standalone unit test (it calls the real `useMultiplayer`); its Leave wiring is covered by the `ConfirmDialog` + `Lobby` tests plus the Task 5 browser smoke check — consistent with how the rest of `MultiplayerApp` is verified.
