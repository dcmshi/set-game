# Scroll Affordance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signal that content exists below the fold with a bouncing down-chevron on the start screen, and give readers a matching up-chevron to jump back to the game.

**Architecture:** Two anchor links and no JavaScript. The down cue is a React sibling of the start-screen card, absolutely positioned against `.app` so it pins to the bottom of the first viewport yet scrolls away with the page. The up cue is plain HTML inside the existing static `#site-content` section. Native smooth scrolling does the animation.

**Tech Stack:** React 19, TypeScript, plain CSS, Vitest + Testing Library (jsdom).

## Global Constraints

- **Do not modify the `.screen` rule** (`src/index.css:139`) — it is shared by eight components (StartScreen, HowToPlay, WinModal, ConfirmDialog, Lobby, MpJoin, MpResults, MultiplayerApp). Confine changes to new class names.
- **JSX SVG attributes are camelCase** (`strokeWidth`, `strokeLinecap`, `strokeLinejoin`); the plain-HTML snippet in Task 2 uses the hyphenated form. Both are correct in their own context — do not "fix" either to match the other.
- **Never set `outline: none`** on the new links. The project gives explicit `:focus-visible` outlines only to cards (`src/index.css:420`) and relies on browser defaults elsewhere; these links follow that convention.
- **New i18n keys go in both `en` and `zh`** in `src/i18n/strings.ts`. `src/i18n/strings.test.ts:3` enforces key parity and will fail otherwise.
- Reuse existing CSS custom properties (`--text`, `--text-soft`, `--radius-sm`, `--dur-fast`, `--ease-out`). Introduce no new colors.
- All work on branch `feature/scroll-affordance`. Never commit to `main` — pushing `main` deploys to Render production.
- `npm run typecheck && npm test && npm run build` must be green before the branch is done.

---

### Task 1: Down cue on the start screen

**Files:**
- Modify: `src/i18n/strings.ts` (add one key to the `en` object near line 10 and the `zh` object near line 110)
- Modify: `src/components/StartScreen.tsx:14-44` (return a fragment; add the cue after the card)
- Modify: `src/index.css:115-121` (add `position: relative` to `.app`) and append new rules
- Test: `src/components/Screens.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: an anchor with `className="scroll-cue"` and `href="#site-content"` on the start screen; the i18n key `start.scrollCue`.

- [ ] **Step 1: Write the failing test**

Append to `src/components/Screens.test.tsx`:

```tsx
it('start screen offers a cue that jumps to the rules section', () => {
  renderWithI18n(
    <StartScreen bestMs={null} onStart={() => {}} onHowToPlay={() => {}} onMultiplayer={() => {}} />
  );
  const cue = screen.getByRole('link', { name: /rules & faq/i });
  expect(cue).toHaveAttribute('href', '#site-content');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/Screens.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "link"`

- [ ] **Step 3: Add the i18n key**

In `src/i18n/strings.ts`, add to the `en` object immediately after `'start.howToPlayBtn'`:

```ts
  'start.scrollCue': 'Rules & FAQ',
```

and to the `zh` object immediately after its `'start.howToPlayBtn'`:

```ts
  'start.scrollCue': '规则与常见问题',
```

- [ ] **Step 4: Render the cue in `StartScreen`**

In `src/components/StartScreen.tsx`, wrap the return in a fragment and add the cue as a
sibling *after* the closing `</div>` of `.screen` — it must not be inside the card:

```tsx
  return (
    <>
      <div className="screen start-screen">
        {/* …existing contents unchanged… */}
      </div>
      <a className="scroll-cue" href="#site-content">
        <span>{t('start.scrollCue')}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </>
  );
```

- [ ] **Step 5: Add the styles**

In `src/index.css`, add `position: relative;` to the existing `.app` rule (line 115) so
the cue positions against it:

```css
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  position: relative;
}
```

Then append to the end of the file:

```css
/* Scroll cue — absolutely positioned against .app (min-height: 100vh) so it sits
   at the bottom of the first viewport but still scrolls away with the page.
   position: fixed would keep it onscreen while reading, which we don't want. */
.scroll-cue {
  position: absolute;
  bottom: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  color: var(--text-soft);
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  transition: color var(--dur-fast) var(--ease-out);
}
.scroll-cue:hover {
  color: var(--text);
}
.scroll-cue svg {
  width: 1.5rem;
  height: 1.5rem;
  animation: scroll-cue-bounce 1.8s var(--ease-out) infinite;
}

/* The reduced-motion block already forces animation-iteration-count: 1,
   so this bounce stops for those users without an extra rule. */
@keyframes scroll-cue-bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(0.3rem); }
  60% { transform: translateY(0.15rem); }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- src/components/Screens.test.tsx src/i18n/strings.test.ts`
Expected: PASS — including the key-parity test, which proves both `en` and `zh` got the key.

- [ ] **Step 7: Commit**

```bash
git add src/i18n/strings.ts src/components/StartScreen.tsx src/index.css src/components/Screens.test.tsx
git commit -m "feat(ux): bouncing scroll cue linking to the rules section"
```

---

### Task 2: Up cue inside the content section

**Files:**
- Modify: `index.html` (add the link as the first child of `<section id="site-content">`, above the `<h2>What is Set?</h2>`)
- Modify: `src/index.css` (append a `.site-content-back` block)
- Test: `src/seo.test.ts`

**Interfaces:**
- Consumes: the `#site-content` section and the `#root` element, both already in `index.html`.
- Produces: an anchor with `class="site-content-back"` and `href="#root"` as the section's first element child.

- [ ] **Step 1: Write the failing test**

Add to `src/seo.test.ts`, inside the existing `describe('crawlable content section', …)`:

```ts
it('opens with a link back to the game', () => {
  const first = html().querySelector('#site-content')!.firstElementChild!;
  expect(first.tagName).toBe('A');
  expect(first.getAttribute('href')).toBe('#root');
  expect(first.textContent!.replace(/\s+/g, ' ').trim()).toBe('Back to game');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/seo.test.ts`
Expected: FAIL — `expected 'H2' to be 'A'`

- [ ] **Step 3: Add the link to `index.html`**

Insert immediately after `<section id="site-content">` and before `<h2>What is Set?</h2>`.
Note the hyphenated SVG attributes — this is plain HTML, not JSX:

```html
      <a class="site-content-back" href="#root">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M18 15l-6-6-6 6" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>Back to game</span>
      </a>
```

- [ ] **Step 4: Add the styles**

Append to `src/index.css`:

```css
.site-content-back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 1.5rem;
  color: var(--text-soft);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
  transition: color var(--dur-fast) var(--ease-out);
}
.site-content-back:hover {
  color: var(--text);
}
.site-content-back svg {
  width: 1.1rem;
  height: 1.1rem;
}
```

`#site-content h2:first-of-type { margin-top: 0 }` still applies — the new link is not
an `h2`, so the first heading keeps its zeroed top margin.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/seo.test.ts`
Expected: PASS

The existing test asserting `#site-content` has exactly four `h2` elements must still
pass — the new link adds no heading.

- [ ] **Step 6: Commit**

```bash
git add index.html src/index.css src/seo.test.ts
git commit -m "feat(ux): back-to-game link atop the content section"
```

---

### Task 3: Smooth scrolling, reduced-motion, and verification

**Files:**
- Modify: `src/index.css` (add an `html` rule near the top, and one line inside the existing `@media (prefers-reduced-motion: reduce)` block at line 535)
- Test: `src/seo.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

Add to `src/seo.test.ts`, inside the existing `describe('crawlable content section', …)`:

```ts
it('scrolls smoothly, except for readers who asked for less motion', () => {
  const css = read('./index.css');
  expect(css).toContain('scroll-behavior: smooth');
  // scroll-behavior is neither an animation nor a transition, so the existing
  // reduced-motion block does not cover it — it needs its own override.
  const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  expect(reduced.slice(0, 400)).toContain('scroll-behavior: auto');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/seo.test.ts`
Expected: FAIL — `expected '…' to contain 'scroll-behavior: smooth'`

- [ ] **Step 3: Add the smooth-scroll rule**

In `src/index.css`, immediately before the existing `body {` rule (line 100):

```css
html {
  scroll-behavior: smooth;
}
```

- [ ] **Step 4: Add the reduced-motion override**

Inside the existing `@media (prefers-reduced-motion: reduce)` block at line 535 — after
the `*, *::before, *::after` rule, still within the block's braces:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
  html {
    scroll-behavior: auto;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/seo.test.ts`
Expected: PASS

- [ ] **Step 6: Run the full suite, typecheck, and build**

Run: `npm run typecheck && npm test && npm run build`
Expected: all green, no regressions in the existing 114 tests.

- [ ] **Step 7: Verify in a browser**

Run `npm run preview` and open the printed URL. Confirm:
- the chevron bounces at the bottom of the start screen;
- clicking it scrolls smoothly to the rules section;
- "Back to game" at the top of that section returns to the start screen;
- pressing Start hides both the cue and the section;
- the cue scrolls out of view as you read, rather than following you.

- [ ] **Step 8: Commit**

```bash
git add src/index.css src/seo.test.ts
git commit -m "feat(ux): smooth anchor scrolling with reduced-motion opt-out"
```
