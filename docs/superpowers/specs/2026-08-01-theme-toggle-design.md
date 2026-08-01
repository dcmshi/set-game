# Set — In-App Light/Dark Theme Toggle

**Status:** Approved design
**Date:** 2026-08-01

## 1. Goal

Dark mode currently lives entirely in one `@media (prefers-color-scheme: dark)`
block (`src/index.css:66`). Nothing in the app reads or writes a theme preference,
so a player who wants the other theme has to change their OS setting.

Add a button that flips between light and dark and remembers the choice.

Two states only — light and dark. There is no "follow the system" state to return
to: before the first press the system default applies, and after it the stored
choice wins for good.

## 2. Preference storage — `src/theme/mode.ts`

A near-copy of `src/theme/palette.ts`, which already solves this exact problem for
the colourblind palette:

```ts
export const MODES = ['light', 'dark'] as const;
export type Mode = (typeof MODES)[number];

const KEY = 'set-game:theme';

export function isMode(value: unknown): value is Mode;

/** The stored choice, or null when the player has not chosen yet. */
export function getStoredMode(): Mode | null;

export function setStoredMode(mode: Mode): void;

/** What the player is actually looking at: the stored choice, else the system. */
export function getEffectiveMode(): Mode;

/** Pins the theme, or hands it back to the system when passed null. */
export function applyMode(mode: Mode | null): void;
```

`getStoredMode` returns `null` rather than defaulting, because "unset" and "light"
must stay distinguishable — a player on a dark OS who has never pressed the button
is looking at dark, and the first press has to produce light.

`getEffectiveMode` falls back to
`matchMedia('(prefers-color-scheme: dark)').matches`, guarded for absence so the
module stays safe under jsdom and any non-browser import.

Both storage functions swallow exceptions exactly as `palette.ts` does — private
browsing can make `localStorage` throw on access.

`applyMode` sets `document.documentElement.dataset.theme`, and deletes the
attribute when passed `null`.

Called from `src/main.tsx` before first paint, beside the existing
`applyPalette(getStoredPalette())`:

```ts
applyMode(getStoredMode());
```

Passing the possibly-`null` stored value directly is what keeps the system default
working: no stored choice means no attribute, and the CSS follows the OS.

## 3. CSS — `light-dark()` instead of a second token block

An explicit choice has to beat the system in **both** directions: a dark-OS player
who picks light needs the light tokens back. Done the obvious way, that means all
23 differing dark tokens exist twice — once under the media query, once under
`:root[data-theme='dark']` — two copies to keep in sync forever.

Every dark override in the sheet is a colour, so `light-dark()` removes the
duplication instead:

```css
:root {
  color-scheme: light dark;                 /* unset ⇒ follow the system */

  --page-1: light-dark(#eef1e9, #12241a);
  --text:   light-dark(#1b241d, #eef1ea);
  /* …one line per themed token, both values in one place */
}

:root[data-theme='light'] { color-scheme: light; }
:root[data-theme='dark']  { color-scheme: dark; }
```

The whole `@media (prefers-color-scheme: dark)` block is **deleted**. The toggle
costs two rules, and each token shows both of its values on one line rather than
splitting them across two blocks 40 lines apart.

`light-dark()` has been Baseline since 2024 (Chrome 123, Safari 17.5,
Firefox 120). The system case remains pure CSS with no JavaScript in it, so there
is still no flash of the wrong theme on load.

**23 tokens convert**, in the order they appear: `--page-1`, `--page-2`,
`--felt-1`, `--felt-2`, `--felt-3`, `--felt-line`, `--card-bg-2`, `--card-border`,
`--card-shadow`, `--text`, `--text-muted`, `--surface`, `--surface-border`,
`--surface-shadow`, `--accent`, `--accent-strong`, `--accent-soft`,
`--danger-soft`, `--success-soft`, `--gold`, `--gold-soft`, `--gold-btn-bg`,
`--hint`.

**`--card-bg` stays a plain `#fdfcf7`.** It is identical in both blocks today —
the cards are the same cardstock under either room lighting, which is what the
sheet's header comment already claims. Wrapping it would imply a difference that
does not exist.

Untouched: `--red` / `--green` / `--purple`, the `--suit-*` indirection, the
`[data-palette='colorblind']` override, radii, durations, easing, fonts.

**Why `color-scheme` on `:root` only.** An unregistered custom property holding
`light-dark()` resolves against the `color-scheme` of the element where it is
*used*, not where it is declared. Since `color-scheme` is set on `:root` and
inherits untouched — nothing else in the sheet sets it — every element resolves
against the same value and the distinction cannot bite. Do not set `color-scheme`
on any other selector.

## 4. The button — `src/components/ThemeToggle.tsx`

Another `icon-btn` beside `PaletteToggle`, in both places that pair appears:
`.start-topline` in `StartScreen` and `.topbar-actions` in `App`.

State is read from storage on mount rather than shared through a context, matching
`PaletteToggle` — the start screen and the in-game bar each render one, never both
at once.

- Icon: inline SVG, a sun in dark mode and a moon in light, `aria-hidden`,
  `stroke="currentColor"` so it picks up `--text-muted` like the other controls.
  Drawn inline rather than as a glyph, consistent with the palette button drawing
  its own dots.
- `aria-pressed={mode === 'dark'}`, `aria-label={t('theme.aria')}`.
- The initial value is `getEffectiveMode()`, so the first press flips away from
  what is on screen rather than jumping to a fixed state.

**Tracking the system while unset.** When nothing is stored, the component
subscribes to `change` on the `prefers-color-scheme` media query and updates its
icon. Without it, an OS that flips at sunset while the start screen is open leaves
the button showing the wrong glyph. The subscription is dropped once a choice is
stored, since the stored choice then wins regardless.

## 5. Phone top bar — the fifth control needs a wrap

`src/styles.test.ts:246` records that Quit + ? + palette + language already
measures 243px in English and 263px in French against a 288px content box at
320px. Another `icon-btn` adds 43px (2.2rem plus a 0.5rem gap): English reaches
~286px and **French overflows at ~306px**.

So `.topbar-actions` gains, on the existing narrow branch only:

```css
flex-wrap: wrap;
justify-content: center;
```

The row wraps to a second line instead of running off-screen. This is the same
class of fix as the stacking already applied to that bar on phones, and the wide
branch — where the actions are pinned absolute beside the centred timer — is
unaffected.

## 6. i18n

One new key in `src/i18n/strings.ts`, added to all five locale objects beside the
existing `palette.aria`:

- `theme.aria` — `Dark mode` / `深色模式` / `Mode sombre` / `Modo oscuro` /
  `ダークモード`

A single label for both directions, as `palette.aria` does: `aria-pressed` carries
the state, so the label names the setting rather than the next action.

## 7. Testing

- **`src/theme/mode.test.ts`** — `getStoredMode` returns `null` when unset and on a
  corrupt stored value; survives a throwing `localStorage`; `getEffectiveMode`
  prefers the stored choice over the media query and falls back to it when unset;
  `applyMode` sets and removes `data-theme`.
- **`src/components/ThemeToggle.test.tsx`** — mirrors
  `PaletteToggle.test.tsx`: starts unpressed on a light system, flips
  `data-theme` and `aria-pressed` on press, flips back on a second press, restores
  across unmount; and starts *pressed* under a stubbed dark media query, where the
  first press yields `light`.
- **`src/styles.test.ts`** — the sheet contains no `prefers-color-scheme` block;
  both `data-theme` selectors pin `color-scheme`; every themed token in `:root`
  carries a `light-dark()` pair; `.topbar-actions` wraps at all four phone widths
  and does not wrap on the wide ones.
- Whole suite green: `npm run typecheck && npm test && npm run build`.

## 8. Non-goals / notes

- **`<meta name="theme-color" content="#6a2ca0">` in `index.html` is unchanged.**
  It is a fixed brand purple under both themes today; making the browser chrome
  theme-reactive is a separate change.
- No third "auto" state, no settings panel, no transition animation on the theme
  swap.
- The `prefers-color-scheme` arm of `matches()` in `styles.test.ts` becomes dead
  once the dark block is gone. Leave it — it is three lines and the harness throws
  on unmodelled features, so removing it only invites a future re-add.
- Work on `feature/theme-toggle`; never commit to `main`, since pushing `main`
  deploys to Render production.
