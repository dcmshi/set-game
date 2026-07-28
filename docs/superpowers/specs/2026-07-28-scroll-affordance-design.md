# Set — Scroll Affordance for the Static Content Section

**Status:** Approved design
**Date:** 2026-07-28

## 1. Goal

The static `#site-content` section added for SEO
([2026-07-28-seo-indexability-design.md](2026-07-28-seo-indexability-design.md))
sits below the fold with nothing to announce it. Add a bouncing down-chevron at the
bottom of the start viewport that jumps to that content, and a matching up-chevron
at the top of the section that jumps back to the game.

Two anchor links. No JavaScript.

## 2. Down cue — React, bilingual

`StartScreen` returns a fragment: the existing `.screen` card plus a sibling
`<a className="scroll-cue" href="#site-content">`. It renders only when the start
screen renders, so it disappears during play with no extra logic and no dependency
on the `data-app-screen` mechanism.

**Markup** (inside `StartScreen`, after the closing `</div>` of `.screen`):

```tsx
<a className="scroll-cue" href="#site-content">
  <span>{t('start.scrollCue')}</span>
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
  </svg>
</a>
```

The label is visible text, so the link needs no `aria-label`. The chevron is
`aria-hidden`.

**Positioning.** `.app` gains `position: relative`; the cue is
`position: absolute; bottom: 1.25rem; left: 50%; transform: translateX(-50%)`.
`.app` is `min-height: 100vh`, so this pins the cue to the bottom of the first
viewport while keeping it in the page — it scrolls away, which `position: fixed`
would not.

Verified safe before adopting: the only absolutely-positioned descendant of `.app`
is `.sr-only` (`src/index.css:123`), which is visually hidden, and `.modal-backdrop`
is `position: fixed` (`src/index.css:262`) — unaffected by an ancestor's
`position: relative`, since only `transform`/`filter`/`will-change` establish a
containing block for fixed elements.

**Do not modify `.screen`.** It is shared by eight components (StartScreen,
HowToPlay, WinModal, ConfirmDialog, Lobby, MpJoin, MpResults, MultiplayerApp).
Adding a sibling in `StartScreen` confines the change to the start screen.

**Bounce.** A `@keyframes scroll-cue-bounce` translateY loop on the chevron. The
existing reduced-motion block (`src/index.css:535`) already forces
`animation-iteration-count: 1`, so the bounce stops for those users with no extra
rule.

## 3. Up cue — static HTML, English

First child of `#site-content`, above the "What is Set?" heading:

```html
<a class="site-content-back" href="#root">
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M18 15l-6-6-6 6" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  <span>Back to game</span>
</a>
```

Targets `#root`, which already exists — no new anchor id. English-only, consistent
with the rest of the static section, which is English by prior decision.

## 4. Smooth scrolling

Add to the top of `src/index.css`:

```css
html {
  scroll-behavior: smooth;
}
```

The reduced-motion block overrides only `animation-duration`,
`animation-iteration-count`, and `transition-duration` — **not** `scroll-behavior`.
It must be added *inside* that existing block at `src/index.css:535`, or
reduced-motion users still get a smooth glide:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { /* …existing rules, unchanged… */ }
  html {
    scroll-behavior: auto;
  }
}
```

Note the JSX above uses React's camelCase SVG attributes (`strokeWidth`); the
plain-HTML snippet in §3 uses the hyphenated form (`stroke-width`). Both are
correct for their context.

## 5. i18n

One new key pair in `src/i18n/strings.ts`, added to both the `en` and `zh` objects
alongside the other `start.*` keys:

- `start.scrollCue` — `Rules & FAQ` / `规则与常见问题`

The up cue takes no key: it lives inside the English-only static section.

## 6. Testing

- **`src/components/Screens.test.tsx`** — the start screen renders a link whose
  `href` is `#site-content` and whose text is the `start.scrollCue` label.
- **`src/seo.test.ts`** — `#site-content`'s first element child is an anchor with
  `href="#root"`; `src/index.css` contains both `scroll-behavior: smooth` and a
  `scroll-behavior: auto` inside the `prefers-reduced-motion` block.
- Existing suites stay green: `npm run typecheck && npm test && npm run build`.

## 7. Non-goals / notes

- **The down cue is absent from the pre-JS HTML.** Deliberate: it is an affordance,
  not content, and a crawler has no use for it. The up cue is in the static HTML
  because it lives inside the section; an internal fragment link is harmless.
- No scroll listener, no fade-on-scroll, no JS at all — the cue scrolling out of
  view is what removes it.
- No sticky or end-of-section return control; one up cue at the top, where the down
  cue lands you.
- Work on `feature/scroll-affordance`; never commit to `main`, since pushing `main`
  deploys to Render production.
