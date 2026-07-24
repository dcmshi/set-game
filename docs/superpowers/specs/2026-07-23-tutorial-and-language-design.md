# Set — How-to-Play Tutorial + Chinese Language Toggle

**Status:** Approved design
**Date:** 2026-07-23

## 1. Goal

Two user-requested additions to the existing Set game:

1. **A detailed "How to Play" tutorial** — a dedicated screen explaining the rule
   and the four features, with **real rendered example cards** showing one valid
   Set and two invalid ones (each with a short reason).
2. **A language toggle (English ⇄ Simplified Chinese)** covering **every**
   user-facing string in the app.

Both are reachable from the **start screen and during play**. The tutorial opens
as an overlay modal; the language toggle is a small `EN | 中` control.

Non-goals: Traditional Chinese, any language beyond these two, server-side
persistence, an interactive click-through tutorial.

## 2. Language behaviour

- **Variant:** Simplified Chinese (简体中文).
- **Scope:** whole app — start screen, tutorial, in-game HUD, timer aria-label,
  win modal, and the screen-reader feedback messages, plus locale-aware card
  aria-labels.
- **First-visit default:** auto-detect. If `navigator.language` starts with `zh`
  → Chinese, otherwise English. The user's explicit choice is then saved to
  `localStorage` and wins on every later visit.
- **Persistence key:** `set-game:lang`, mirroring the existing
  `set-game:best-ms` storage pattern (wrapped in try/catch, degrades silently
  when storage is unavailable).

## 3. Architecture

A small, zero-dependency i18n layer built on React context. No new npm
dependencies. New module `src/i18n/`:

| File | Responsibility |
|------|----------------|
| `strings.ts` | The typed `{ en, zh }` dictionary; `Lang` type; `StringKey` type derived from the `en` keys. |
| `detectLang.ts` | Pure `detectLang(navigatorLanguage: string \| undefined): Lang` — testable without a DOM. |
| `langStorage.ts` | `getStoredLang()` / `setStoredLang(lang)` — localStorage read/write, try/catch guarded. |
| `LanguageContext.tsx` | `LanguageProvider` (initial lang = stored ?? detected; persists on change), the context, and the `useT()` hook returning `{ t, lang, setLang }`. |

- **`t(key, params?)`** looks up `strings[lang][key]` and does `{name}`-style
  interpolation (e.g. `t('win.best', { time: '01:23.4' })`). If a key is somehow
  missing it falls back to the `en` string, then to the key itself.
- `LanguageProvider` wraps `<App />` in `main.tsx`.

### Component changes

- **`main.tsx`** — wrap `<App />` in `<LanguageProvider>`.
- **New `src/components/LanguageToggle.tsx`** — an `EN | 中` segmented control:
  two `<button>`s in a `role="group"` with `aria-label`, each using
  `aria-pressed` to mark the active language. Calls `setLang`. Rendered on the
  start screen and in the in-game topbar.
- **New `src/components/HowToPlay.tsx`** — the tutorial overlay (see §4).
- **New `src/components/CardFace.tsx`** — presentational card visuals extracted
  from `Card.tsx`. Renders the row of shape SVGs for a given card. `SHAPE_PATH`
  and the `ShapeSvg` helper move here. `Card.tsx` becomes the interactive
  `<button>` wrapper around `<CardFace>`; `HowToPlay` reuses `<CardFace>` inside a
  static, non-interactive card container so example cards look identical to real
  ones. **No visual change to the live board.**
- **`StartScreen.tsx`** — strings via `t()`; add a **"How to Play"** button and
  the `LanguageToggle`.
- **`Hud.tsx`, `Timer.tsx`, `WinModal.tsx`** — strings and aria-labels via `t()`.
- **`Card.tsx`** — aria-label built via a locale-aware helper (see §6), using
  `useT()`.
- **`App.tsx`** — feedback messages via `t()`; owns the tutorial open/close state
  and the in-game topbar `?` button + `LanguageToggle`; wires the timer pause
  (see §5).
- **`useGame.ts`** — single source of truth for whether the clock runs (see §5).

## 4. The How-to-Play tutorial

Rendered as an **overlay modal** (same pattern as `WinModal`:
`.modal-backdrop` + `role="dialog"` + `aria-modal`), so it layers over whichever
screen is active without changing `screen` state. Focus moves to the close
control on open; `Esc` and the "Got it" / ✕ buttons close it.

Content, top to bottom:

1. **Title** + **intro rule**: *"A Set is 3 cards where, for each of the four
   features, the values are either all the same or all different."*
2. **The four features**, each with its three values illustrated: Count (1·2·3),
   Color (red·green·purple), Shape (diamond·squiggle·oval), Shading
   (solid·striped·open).
3. **Example cards** rendered with `<CardFace>`:

| Example | Cards | Verdict | Reason shown |
|---------|-------|---------|--------------|
| Valid | 1 red solid diamond · 2 green striped squiggle · 3 purple open oval | ✓ Set | Every feature is all-different. |
| Invalid A | 1 red solid diamond · 2 red striped squiggle · 3 purple open oval | ✗ | Colors are red, red, purple — two the same, one different. |
| Invalid B | 1 red solid diamond · 2 green solid squiggle · 3 purple striped oval | ✗ | Shadings are solid, solid, striped — neither all-same nor all-different. |

Each example above isolates a **single** feature that passes (valid) or fails
(invalid), so the reason is unambiguous. These exact card triples are asserted
against the real `isSet` engine in tests (§7), so the tutorial can never drift
into showing an incorrect example.

## 5. Timer while the tutorial is open

Opening the tutorial **during play pauses the clock**; closing it resumes.
Opening it from the start screen has no timer effect.

The tab-visibility pause and the tutorial pause must not fight each other (a
tab-hidden→shown cycle must not resume a clock the tutorial is holding paused).
So `useGame` gets a **single source of truth**:

- New state `paused` (tutorial) and `hidden` (tab visibility, set by the existing
  `visibilitychange` listener).
- One effect: while `screen === 'playing'`, the timer runs **iff
  `!paused && !hidden`**; otherwise it is paused. It calls the existing
  idempotent `pauseTimer` / `resumeTimer`.
- `useGame` exposes `pause()` / `resume()`. `start()` resets `paused = false`.
- `App` calls `g.pause()` when the tutorial opens and `g.resume()` when it closes
  (no-ops for the clock unless a game is in progress).

The display RAF tick already reads `elapsedMs`, which freezes while paused — so
the on-screen time visibly stops during the tutorial.

## 6. Card aria-labels (locale-aware)

Today `ariaLabel` produces English with pluralisation, e.g. `"3 solid red
diamonds"`. Chinese has no plural forms and a different word order, so the label
is built from per-locale feature tables + a template:

- **English:** `{count} {shading} {color} {shapePlural}` → `"3 solid red diamonds"`
  (unchanged from today; keeps existing tests green).
- **Chinese:** `{count}个{color}{shading}{shape}` → e.g. `"3个红色实心菱形"`.

Feature-value strings live in the dictionary (`color.red`, `shape.diamond`,
`shading.solid`, …). The label builder takes the card + `t` + `lang`.

**Draft Chinese vocabulary** (flagged for a native-speaker check before ship):

| Feature | en | zh |
|---------|----|----|
| color | red / green / purple | 红色 / 绿色 / 紫色 |
| shape | diamond / squiggle / oval | 菱形 / 波浪形 / 椭圆形 |
| shading | solid / striped / open | 实心 / 条纹 / 空心 |

## 7. Testing

New tests:

- **`i18n/strings.test.ts`** — `en` and `zh` expose the **identical set of keys**
  (guards against a forgotten translation). Also: no empty string values.
- **`i18n/detectLang.test.ts`** — `'zh-CN'`/`'zh'` → `zh`; `'en-US'`/`undefined`
  → `en`.
- **`i18n/LanguageContext.test.tsx`** — default = stored value if present, else
  detected; `setLang` updates rendered strings and writes localStorage.
- **`components/HowToPlay.test.tsx`** — renders; the three example triples are
  validated against the real `isSet` (valid one returns true, the two invalid
  return false); close button/`Esc` fire `onClose`.
- **`components/LanguageToggle.test.tsx`** — clicking `中` switches strings;
  `aria-pressed` tracks the active language.

Updated tests:

- A **`src/test/renderWithI18n.tsx`** helper wraps a UI in `<LanguageProvider>`.
- Existing tests that render `App`/`Hud`/`StartScreen`/`WinModal` and assert
  English text switch to `renderWithI18n`. Default language in tests is English
  (jsdom `navigator.language` is `en-US` and no stored value), so existing
  English assertions keep passing. `Card` aria-label English output is unchanged.

## 8. String inventory (initial)

Grouped keys (`en` shown; `zh` provided for each). Not exhaustive of final
wording, but the complete set of user-facing strings to translate:

- `start.tagline`, `start.rule1..3`, `start.best` `(→ {time})`, `start.startBtn`,
  `start.howToPlayBtn`
- `howto.title`, `howto.intro`, `howto.featuresTitle`,
  `howto.feature.{count,color,shape,shading}`, `howto.validTitle`,
  `howto.validWhy`, `howto.invalidTitle`, `howto.invalidAWhy`,
  `howto.invalidBWhy`, `howto.close`, `howto.closeAria`
- `hud.deck`, `hud.mistakes`, `hud.hint`
- `topbar.howToAria`, `lang.groupAria`
- `timer.aria`
- `win.eyebrow`, `win.title`, `win.record`, `win.best` `(→ {time})`,
  `win.playAgain`, `win.dialogLabel`
- `feedback.won` `(→ {time})`, `feedback.setFound`, `feedback.notSet`,
  `feedback.hint`
- `color.{red,green,purple}`, `shape.{diamond,squiggle,oval}`,
  `shading.{solid,striped,open}`, and the two `ariaTemplate.{en,zh}` (or handled
  in the builder).

## 9. Styling

Follows existing conventions in `src/index.css` (class-based, no CSS-in-JS). New
classes: `.how-to-modal`, `.howto-feature-row`, `.howto-example`,
`.example-card` (static clone of `.card` visuals), `.lang-toggle`,
`.topbar-actions`. The in-game `.topbar` gains a right-aligned action group
(`?` + language toggle) beside the timer. Reuses existing `.modal-backdrop`,
`.primary-btn`, card/color classes.

## 10. Deployment note

Per project memory, **pushing to `main` ships straight to Render production**.
This work stays on a feature branch; `npm run typecheck`, `npm test`, and
`npm run build` must all pass before any merge to `main`.
