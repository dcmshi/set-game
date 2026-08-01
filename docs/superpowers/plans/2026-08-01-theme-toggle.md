# Light/Dark Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a button that flips the page between light and dark and remembers the choice, replacing the system-only `prefers-color-scheme` behaviour.

**Architecture:** A `data-theme` attribute on `<html>`, written before first paint from `localStorage`, pins the root's `color-scheme`. Every themed CSS token becomes a single `light-dark(light, dark)` pair that resolves off that `color-scheme`, so the dark override block disappears and an explicit choice beats the system in both directions with no duplicated tokens.

**Tech Stack:** React 19, TypeScript, Vite 8, Vitest 4 + jsdom, Testing Library. No new dependencies.

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-08-01-theme-toggle-design.md`.
- Work on `feature/theme-toggle` (already created and checked out). Never commit to `main` — pushing `main` deploys to Render production.
- Storage key is exactly `set-game:theme`. Attribute is exactly `data-theme`, values exactly `light` and `dark`.
- Two states only. No third "auto"/"system" state anywhere in the UI.
- `color-scheme` is declared on `:root` and on the two `:root[data-theme=…]` rules — **nowhere else**. An unregistered custom property holding `light-dark()` resolves against the `color-scheme` of the element where it is *used*, so a second declaration elsewhere would silently split the theme.
- `--card-bg` stays a plain `#fdfcf7`. It is identical in both themes today; the cards are the same cardstock under either room lighting.
- Never remap `--red` / `--green` / `--purple` or the `--suit-*` tokens. They are the palette's business, not the theme's.
- `<meta name="theme-color">` in `index.html` is out of scope and must not change.
- Every storage read and write is wrapped in `try`/`catch`, matching `src/theme/palette.ts` — private browsing can make `localStorage` throw on access.
- Match the surrounding comment density: comments state constraints the code cannot show, never what the next line does.

---

### Task 1: Theme preference module

**Files:**
- Create: `src/theme/mode.ts`
- Test: `src/theme/mode.test.ts`

**Interfaces:**
- Consumes: nothing. This is the base of the feature.
- Produces:
  - `MODES: readonly ['light', 'dark']`
  - `type Mode = 'light' | 'dark'`
  - `isMode(value: unknown): value is Mode`
  - `getStoredMode(): Mode | null` — `null` when unchosen
  - `setStoredMode(mode: Mode): void`
  - `systemPrefersDark(): boolean`
  - `getEffectiveMode(): Mode`
  - `applyMode(mode: Mode | null): void`
  - `watchSystemMode(onChange: (mode: Mode) => void): () => void` — returns an unsubscribe

- [ ] **Step 1: Write the failing test**

Create `src/theme/mode.test.ts`:

```ts
import { applyMode, getEffectiveMode, getStoredMode, isMode, setStoredMode, systemPrefersDark, watchSystemMode } from './mode';

/** jsdom's matchMedia never matches, so the system side has to be stubbed. */
function stubMatchMedia(dark: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    matches: dark,
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => void listeners.add(fn),
    removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => void listeners.delete(fn),
  }));
  return {
    count: () => listeners.size,
    flip: (matches: boolean) => listeners.forEach((fn) => fn({ matches } as MediaQueryListEvent)),
  };
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// "Unset" and "light" have to stay distinguishable: a player on a dark OS who has
// never pressed the button is looking at dark, so the first press must yield light.
it('reports no stored choice until one is made', () => {
  expect(getStoredMode()).toBeNull();
});

it('round-trips a stored choice', () => {
  setStoredMode('dark');
  expect(getStoredMode()).toBe('dark');
  setStoredMode('light');
  expect(getStoredMode()).toBe('light');
});

it('ignores a value it does not recognise', () => {
  localStorage.setItem('set-game:theme', 'sepia');
  expect(getStoredMode()).toBeNull();
});

it('recognises only the modes it ships', () => {
  expect(isMode('light')).toBe(true);
  expect(isMode('dark')).toBe(true);
  expect(isMode('auto')).toBe(false);
  expect(isMode(null)).toBe(false);
});

it('survives storage that throws on access', () => {
  const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied');
  });
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('denied');
  });

  expect(getStoredMode()).toBeNull();
  expect(() => setStoredMode('dark')).not.toThrow();

  getItem.mockRestore();
  setItem.mockRestore();
});

describe('the effective mode', () => {
  it('follows the system while nothing is stored', () => {
    stubMatchMedia(true);
    expect(systemPrefersDark()).toBe(true);
    expect(getEffectiveMode()).toBe('dark');

    stubMatchMedia(false);
    expect(getEffectiveMode()).toBe('light');
  });

  it('prefers a stored choice over the system', () => {
    stubMatchMedia(true);
    setStoredMode('light');
    expect(getEffectiveMode()).toBe('light');
  });

  it('reads as light where matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(systemPrefersDark()).toBe(false);
    expect(getEffectiveMode()).toBe('light');
  });
});

// Theme tokens are light-dark() pairs resolved from color-scheme, so applying a
// mode is one attribute on <html> — and dropping it returns the page to the OS.
it('pins a mode onto the root element and can hand it back', () => {
  applyMode('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
  applyMode('light');
  expect(document.documentElement.dataset.theme).toBe('light');
  applyMode(null);
  expect(document.documentElement.dataset.theme).toBeUndefined();
});

describe('watching the system', () => {
  it('reports a system flip and unsubscribes when released', () => {
    const mql = stubMatchMedia(false);
    const seen: string[] = [];

    const stop = watchSystemMode((mode) => seen.push(mode));
    mql.flip(true);
    mql.flip(false);
    expect(seen).toEqual(['dark', 'light']);

    stop();
    expect(mql.count()).toBe(0);
    mql.flip(true);
    expect(seen).toEqual(['dark', 'light']);
  });

  it('returns a usable release where matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(() => watchSystemMode(() => {})()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/theme/mode.test.ts`
Expected: FAIL — cannot resolve `./mode`.

- [ ] **Step 3: Write minimal implementation**

Create `src/theme/mode.ts`:

```ts
export const MODES = ['light', 'dark'] as const;
export type Mode = (typeof MODES)[number];

const KEY = 'set-game:theme';
const DARK = '(prefers-color-scheme: dark)';

export function isMode(value: unknown): value is Mode {
  return typeof value === 'string' && (MODES as readonly string[]).includes(value);
}

/**
 * Null rather than a default, because "unset" and "light" are different states:
 * a player on a dark OS who has never chosen is looking at dark, so the first
 * press has to produce light.
 */
export function getStoredMode(): Mode | null {
  try {
    const raw = localStorage.getItem(KEY);
    return isMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setStoredMode(mode: Mode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* storage unavailable — ignore */
  }
}

export function systemPrefersDark(): boolean {
  return window.matchMedia?.(DARK).matches ?? false;
}

/** What the player is actually looking at. */
export function getEffectiveMode(): Mode {
  return getStoredMode() ?? (systemPrefersDark() ? 'dark' : 'light');
}

/**
 * Theme tokens are light-dark() pairs resolved from the root color-scheme, so
 * pinning a theme is one attribute on <html> — and removing it hands the page
 * back to the system setting.
 */
export function applyMode(mode: Mode | null): void {
  if (mode) document.documentElement.dataset.theme = mode;
  else delete document.documentElement.dataset.theme;
}

/** Subscribes to system theme changes; call the result to release it. */
export function watchSystemMode(onChange: (mode: Mode) => void): () => void {
  const mql = window.matchMedia?.(DARK);
  if (!mql) return () => {};
  const handler = (e: MediaQueryListEvent) => onChange(e.matches ? 'dark' : 'light');
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/theme/mode.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Apply the stored mode before first paint**

Modify `src/main.tsx`. Add to the existing theme import line region:

```ts
import { applyMode, getStoredMode } from './theme/mode';
```

And beside the existing `applyPalette(getStoredPalette());` (extend the comment above it):

```ts
// Before the first paint, so a returning player never sees the classic suits or
// the system theme flash in before their stored choices take effect. A null mode
// leaves the attribute off, which is what keeps the system default working.
applyPalette(getStoredPalette());
applyMode(getStoredMode());
```

- [ ] **Step 6: Verify typecheck and the whole suite**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/theme/mode.ts src/theme/mode.test.ts src/main.tsx
git commit -m "feat(theme): remember a light/dark choice across visits"
```

---

### Task 2: Convert the token block to `light-dark()`

**Files:**
- Modify: `src/index.css:8-98` (the `:root` block and the `@media (prefers-color-scheme: dark)` block that follows it)
- Test: `src/styles.test.ts`

**Interfaces:**
- Consumes: the `data-theme` attribute values produced by `applyMode` in Task 1.
- Produces: a sheet with no `prefers-color-scheme` block, and `:root[data-theme='light']` / `:root[data-theme='dark']` rules that pin `color-scheme`.

- [ ] **Step 1: Write the failing test**

Add to `src/styles.test.ts`, after the existing `describe('suit colours', …)` block:

```ts
/* Every token whose value differs between the two themes. --card-bg is absent on
   purpose: it is the same cardstock under either room lighting. */
const THEMED_TOKENS = [
  'page-1', 'page-2',
  'felt-1', 'felt-2', 'felt-3', 'felt-line',
  'card-bg-2', 'card-border', 'card-shadow',
  'text', 'text-muted',
  'surface', 'surface-border', 'surface-shadow',
  'accent', 'accent-strong', 'accent-soft',
  'danger-soft', 'success-soft',
  'gold', 'gold-soft', 'gold-btn-bg', 'hint',
];

describe('light and dark themes', () => {
  // An explicit choice has to beat the system in both directions, which a media
  // query alone cannot do. Duplicating the dark tokens under a second selector
  // would work but leaves two copies to keep in sync; light-dark() keeps one.
  it('carries both values on every themed token, with no dark override block', () => {
    expect(css()).not.toContain('prefers-color-scheme');
    const root = body(':root');
    for (const token of THEMED_TOKENS) {
      expect(root, token).toMatch(new RegExp(`--${token}:\\s*light-dark\\(`));
    }
  });

  it('leaves the cardstock the same under both', () => {
    const root = body(':root');
    expect(root).toMatch(/--card-bg:\s*#fdfcf7/);
    expect(root).not.toMatch(/--card-bg:\s*light-dark/);
  });

  // light-dark() in an unregistered custom property resolves against the
  // color-scheme of the element it is *used* on, so a second color-scheme
  // declaration anywhere else would split the theme.
  it('declares color-scheme only on the root and the two explicit choices', () => {
    expect(selectors(css()).filter((s) => bodiesIn(css(), s).some((d) => /(^|;)\s*color-scheme:/.test(d))).sort())
      .toEqual([':root', ":root[data-theme='dark']", ":root[data-theme='light']"]);
  });

  it('lets an explicit choice pin the scheme in either direction', () => {
    expect(body(':root')).toMatch(/color-scheme:\s*light dark/);
    expect(body(":root[data-theme='light']")).toBe('color-scheme: light;');
    expect(body(":root[data-theme='dark']")).toBe('color-scheme: dark;');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/styles.test.ts`
Expected: FAIL — `css()` still contains `prefers-color-scheme`; no rule for `:root[data-theme='light']`.

- [ ] **Step 3: Rewrite the token block**

In `src/index.css`, replace lines 8–98 (from `:root {` through the closing `}` of the `@media (prefers-color-scheme: dark)` block) with:

```css
:root {
  /* Unset, this follows the OS; the data-theme rules below pin it when the
     player has chosen. Declared nowhere else — see the note at the bottom. */
  color-scheme: light dark;

  /* Shared by both themes. --red and --green double as the danger/success hues,
     so the suits point at them through their own tokens instead of using them
     directly — that way a palette swap recolors cards and nothing else. */
  --red: #c8283f;
  --green: #1f8f4e;
  --purple: #6b3fa0;

  --suit-red: var(--red);
  --suit-green: var(--green);
  --suit-purple: var(--purple);

  /* Themed tokens carry light and dark in one place. */
  --page-1: light-dark(#eef1e9, #12241a);
  --page-2: light-dark(#e3e8dc, #0c1a13);
  --felt-1: light-dark(#3d9765, #1f6944);
  --felt-2: light-dark(#257049, #123f29);
  --felt-3: light-dark(#164f33, #081f14);
  --felt-line: light-dark(rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.07));

  /* The cards are the same cardstock under either room lighting, so only their
     secondary tones and edges shift. */
  --card-bg: #fdfcf7;
  --card-bg-2: light-dark(#f5f2e8, #f2efe3);
  --card-border: light-dark(#e3ddc8, #d9d3bd);
  --card-shadow: light-dark(rgba(24, 34, 26, 0.22), rgba(0, 0, 0, 0.55));

  --text: light-dark(#1b241d, #eef1ea);
  --text-muted: light-dark(rgba(27, 36, 29, 0.64), rgba(238, 241, 234, 0.68));

  --surface: light-dark(#ffffff, #16241b);
  --surface-border: light-dark(rgba(27, 36, 29, 0.1), rgba(238, 241, 234, 0.1));
  --surface-shadow: light-dark(rgba(24, 34, 26, 0.16), rgba(0, 0, 0, 0.45));

  --accent: light-dark(#2f6fed, #5b9dff);
  --accent-strong: light-dark(#1d55c9, #8ebcff);
  --accent-soft: light-dark(rgba(47, 111, 237, 0.16), rgba(91, 157, 255, 0.22));
  --danger-soft: light-dark(rgba(200, 40, 63, 0.14), rgba(255, 107, 129, 0.18));
  --success-soft: light-dark(rgba(31, 143, 78, 0.16), rgba(70, 210, 133, 0.2));
  /* Deeper amber in light mode keeps gold text at AA contrast on cream/white;
     the brighter dark value reads against the dark surfaces. */
  --gold: light-dark(#96610b, #c98a12);
  --gold-soft: light-dark(rgba(150, 97, 11, 0.18), rgba(240, 180, 60, 0.22));
  --gold-btn-bg: light-dark(rgba(150, 97, 11, 0.1), rgba(240, 180, 60, 0.08));
  /* More saturated than --gold so the hint highlight reads clearly. */
  --hint: light-dark(#e0990f, #f2b21e);

  --radius-lg: 1.5rem;
  --radius-md: 1rem;
  --radius-sm: 0.6rem;

  --dur-fast: 0.15s;
  --dur-med: 0.28s;
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);

  --font-display: ui-rounded, 'SF Pro Rounded', 'Segoe UI Rounded', 'Segoe UI', system-ui, sans-serif;
  --font-body: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

/* An in-app choice has to beat the OS in both directions, so it cannot be a
   media query. These two rules are the only other place color-scheme appears:
   light-dark() inside an unregistered custom property resolves against the
   color-scheme of the element it is used on, and every element inherits the
   root's — a third declaration elsewhere would split the theme in half. */
:root[data-theme='light'] {
  color-scheme: light;
}
:root[data-theme='dark'] {
  color-scheme: dark;
}
```

Also update the sheet's header comment (lines 1–6) so it no longer describes two blocks:

```css
/* -------------------------------------------------------------------------
   Set — visual design system
   A card-table aesthetic: cream cardstock symbols dealt onto a felt board.
   Light and dark are both first-class, each token carrying both values in a
   light-dark() pair; only the "room lighting" (page and felt tones) shifts
   between them — the cards themselves stay true cardstock.
   ---------------------------------------------------------------------- */
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/styles.test.ts`
Expected: PASS. The pre-existing tests in that file must stay green too — in particular the hover-guard test, which walks the whole sheet.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/styles.test.ts
git commit -m "refactor(css): pair each themed token with light-dark()"
```

---

### Task 3: The toggle button

**Files:**
- Create: `src/components/ThemeToggle.tsx`
- Create: `src/components/ThemeToggle.test.tsx`
- Modify: `src/i18n/strings.ts` (five locale objects, beside each `'palette.aria'`)
- Modify: `src/index.css` (add `.theme-btn` / `.theme-icon` after the existing `.palette-dot` rule)
- Modify: `src/components/StartScreen.tsx:19` (add beside `<PaletteToggle />`)
- Modify: `src/App.tsx:101` (add beside `<PaletteToggle />`)

**Interfaces:**
- Consumes: `applyMode`, `getEffectiveMode`, `getStoredMode`, `setStoredMode`, `watchSystemMode`, `type Mode` from `src/theme/mode` (Task 1); `useT` from `src/i18n/LanguageContext`.
- Produces: `ThemeToggle()` — a no-prop component.

- [ ] **Step 1: Write the failing test**

Create `src/components/ThemeToggle.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';
import { getStoredMode } from '../theme/mode';

function stubMatchMedia(dark: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    matches: dark,
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => void listeners.add(fn),
    removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => void listeners.delete(fn),
  }));
  return { flip: (matches: boolean) => listeners.forEach((fn) => fn({ matches } as MediaQueryListEvent)) };
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  stubMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const toggle = () => screen.getByRole('button', { name: /dark mode/i });

it('starts unpressed on a light system', () => {
  render(<ThemeToggle />);
  expect(toggle()).toHaveAttribute('aria-pressed', 'false');
});

it('pins the theme on the root element when pressed', async () => {
  render(<ThemeToggle />);
  await userEvent.click(toggle());

  expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  expect(document.documentElement.dataset.theme).toBe('dark');
});

it('switches back on a second press', async () => {
  render(<ThemeToggle />);
  await userEvent.click(toggle());
  await userEvent.click(toggle());

  expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  expect(document.documentElement.dataset.theme).toBe('light');
});

it('remembers the choice for the next visit', async () => {
  const { unmount } = render(<ThemeToggle />);
  await userEvent.click(toggle());
  expect(getStoredMode()).toBe('dark');
  unmount();

  render(<ThemeToggle />);
  expect(toggle()).toHaveAttribute('aria-pressed', 'true');
});

// The first press has to flip away from what is on screen, not jump to a fixed
// state — otherwise it appears to do nothing for a player on a dark OS.
it('starts pressed on a dark system, and its first press yields light', async () => {
  stubMatchMedia(true);
  render(<ThemeToggle />);
  expect(toggle()).toHaveAttribute('aria-pressed', 'true');

  await userEvent.click(toggle());
  expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  expect(document.documentElement.dataset.theme).toBe('light');
});

describe('while no choice is stored', () => {
  it('follows a system flip, so the icon cannot go stale', () => {
    const mql = stubMatchMedia(false);
    render(<ThemeToggle />);

    mql.flip(true);
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('stops following once the player has chosen', async () => {
    const mql = stubMatchMedia(false);
    render(<ThemeToggle />);
    await userEvent.click(toggle());

    mql.flip(false);
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ThemeToggle.test.tsx`
Expected: FAIL — cannot resolve `./ThemeToggle`.

- [ ] **Step 3: Add the i18n key**

In `src/i18n/strings.ts`, add a `'theme.aria'` line directly after each of the five existing `'palette.aria'` lines (they are at lines 38, 143, 245, 347, 448 before this edit; adding shifts the later ones, so work bottom-up or re-grep between edits):

```ts
  'theme.aria': 'Dark mode',        // en, after line 38
  'theme.aria': '深色模式',           // zh
  'theme.aria': 'Mode sombre',      // fr
  'theme.aria': 'Modo oscuro',      // es
  'theme.aria': 'ダークモード',        // ja
```

One label for both directions, as `palette.aria` does: `aria-pressed` carries the state, so the label names the setting rather than the next action. Do not keep the trailing `// en` style comments — they are only here to say which object each line belongs in.

- [ ] **Step 4: Write the component**

Create `src/components/ThemeToggle.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useT } from '../i18n/LanguageContext';
import {
  applyMode,
  getEffectiveMode,
  getStoredMode,
  setStoredMode,
  watchSystemMode,
  type Mode,
} from '../theme/mode';

function SunIcon() {
  return (
    <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.5 13.3A8.5 8.5 0 1 1 10.7 3.5a6.6 6.6 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

/**
 * The icon shows the theme the button is about to switch to, so the effect of
 * pressing it is visible without reading the label. State is read from storage
 * on mount rather than shared through a context: the start screen and the
 * in-game top bar each render one, and never both at once.
 */
export function ThemeToggle() {
  const { t } = useT();
  const [mode, setMode] = useState<Mode>(getEffectiveMode);

  // Until a choice is stored the button is only mirroring the OS, so it has to
  // follow a system flip — an OS that switches at sunset would otherwise leave
  // the wrong icon showing.
  useEffect(
    () =>
      watchSystemMode((next) => {
        if (!getStoredMode()) setMode(next);
      }),
    []
  );

  const swap = () => {
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    setStoredMode(next);
    applyMode(next);
  };

  return (
    <button
      type="button"
      className="icon-btn theme-btn"
      aria-label={t('theme.aria')}
      aria-pressed={mode === 'dark'}
      onClick={swap}
    >
      {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
```

- [ ] **Step 5: Style it**

In `src/index.css`, after the existing `.palette-dot` rule (currently `src/index.css:661-666`):

```css
.theme-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.theme-icon {
  width: 1.15rem;
  height: 1.15rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/components/ThemeToggle.test.tsx`
Expected: PASS, all cases.

- [ ] **Step 7: Mount it in both bars**

In `src/components/StartScreen.tsx`, add the import beside the existing `PaletteToggle` import and render it first in `.start-topline`:

```tsx
import { ThemeToggle } from './ThemeToggle';
```

```tsx
        <div className="start-topline">
          <ThemeToggle />
          <PaletteToggle />
          <LanguageToggle />
        </div>
```

In `src/App.tsx`, the same, in `.topbar-actions`:

```tsx
import { ThemeToggle } from './components/ThemeToggle';
```

```tsx
              <ThemeToggle />
              <PaletteToggle />
              <LanguageToggle />
```

- [ ] **Step 8: Verify typecheck and the whole suite**

Run: `npm run typecheck && npm test`
Expected: PASS. `src/components/Screens.test.tsx` renders the start screen — if it asserts on the control count or queries a button by an ambiguous accessible name, update that assertion to include the new button rather than working around it.

- [ ] **Step 9: Commit**

```bash
git add src/components/ThemeToggle.tsx src/components/ThemeToggle.test.tsx src/i18n/strings.ts src/index.css src/components/StartScreen.tsx src/App.tsx
git commit -m "feat(theme): add a light/dark toggle to both top bars"
```

---

### Task 4: Stop the fifth control overflowing a phone

**Files:**
- Modify: `src/index.css` — the narrow-viewport `.topbar-actions` rule (the one asserted at `src/styles.test.ts:258`, inside the phone `@media (max-width: 30rem)` block)
- Test: `src/styles.test.ts`

**Interfaces:**
- Consumes: the fifth control added in Task 3.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Add to the existing `describe('in-game top bar', …)` block in `src/styles.test.ts`:

```ts
  // Quit + ? + theme + palette + language is ~286px in English and ~306px in
  // French against a 288px content box at 320px, so the row cannot stay on one
  // line. Wrapping it is what keeps the French bar on-screen.
  it('wraps the actions rather than overflowing on a narrow viewport', () => {
    for (const width of PHONE_WIDTHS) {
      expect(at(width).value('.topbar-actions', 'flex-wrap'), `at ${width}px`).toBe('wrap');
      expect(at(width).value('.topbar-actions', 'justify-content'), `at ${width}px`).toBe('center');
    }
  });

  // Above the breakpoint the actions are pinned beside the centred timer, where
  // there is room for one line and wrapping would only misalign them.
  it('keeps them on one line above the breakpoint', () => {
    for (const width of WIDE_WIDTHS) {
      expect(at(width).value('.topbar-actions', 'flex-wrap'), `at ${width}px`).toBeUndefined();
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/styles.test.ts`
Expected: FAIL — `flex-wrap` resolves to `undefined` at the phone widths.

- [ ] **Step 3: Add the wrap**

Find the `.topbar-actions` rule inside the phone `@media` block — the one that already sets `position: static` and `transform: none`. Add two declarations to it:

```css
    flex-wrap: wrap;
    justify-content: center;
```

Do **not** add `flex-wrap` to the top-level `.topbar-actions` rule; the wide branch must leave it unset.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/styles.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/styles.test.ts
git commit -m "fix(css): wrap the top-bar actions instead of overflowing a phone"
```

---

### Task 5: Full verification

**Files:** none modified unless a failure turns one up.

- [ ] **Step 1: Run the whole suite, typecheck, and build**

Run: `npm run typecheck && npm test && npm run build`
Expected: all PASS, build succeeds.

- [ ] **Step 2: Confirm the CSS survived the build**

Run: `grep -c "light-dark(" dist/assets/*.css`
Expected: a non-zero count. Vite must not have downlevelled or dropped `light-dark()`. If the count is 0, check the build target before going further — the feature is inert without it.

- [ ] **Step 3: Drive it in a browser**

Start the dev server (`npm run dev`) and open it in Chrome. Confirm, in order:

1. The toggle appears on the start screen and in the in-game top bar.
2. Pressing it flips the page — page background, felt, and surfaces all move together, with no element left in the old theme.
3. The cards stay cream cardstock in both.
4. Reloading keeps the chosen theme, with no flash of the other one.
5. At a 320px viewport with French selected, the in-game actions wrap and nothing runs off-screen or covers the timer.

- [ ] **Step 4: Commit anything the browser pass turned up**

Only if step 3 required a fix. Otherwise the branch is done.

---

## Notes for the reviewer

- The `prefers-color-scheme` arm of `matches()` in `src/styles.test.ts:116` goes unused once Task 2 lands. Leave it: it is three lines, and `matches()` throws on unmodelled features, so deleting it only invites a future re-add.
- Task 3 leaves the app overflowing at 320px in French until Task 4 lands. That is the intended order — the wrap is a separate reviewable decision.
