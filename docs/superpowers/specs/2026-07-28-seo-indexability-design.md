# Set — Search Indexability (SEO)

**Status:** Approved design
**Date:** 2026-07-28

## 1. Goal

Make the site correctly indexable by Google and give it enough real content to
compete for long-tail queries ("play set card game online free", "set card game
multiplayer", "set game rules"). Today the served HTML is a `<title>` and an empty
`<div id="root">` — no description, no social tags, no canonical, no `robots.txt`,
no `sitemap.xml`, and zero text before JavaScript runs.

**Explicit non-goal: the head term.** `setgame.com` is the game's actual publisher
and owns "set game". This work targets the long tail. The `onrender.com` subdomain
also caps the ceiling regardless of on-page quality.

## 2. Head metadata — `index.html`

| Tag | Value |
|-----|-------|
| `<title>` | `Play Set Online — Free Speed Card Game, Solo or Multiplayer` |
| `<meta name="description">` | `Play Set free in your browser. Race the clock to clear all 81 cards solo, or challenge friends to grab Sets on a shared board in real time. No signup.` |
| `<link rel="canonical">` | `https://set-game-qn3r.onrender.com/` |
| `og:type` / `og:site_name` / `og:locale` | `website` / `Set — Speed Card Game` / `en_US` |
| `og:title` / `og:description` / `og:url` | mirror title / description / canonical |
| `og:image` (+ `:width`, `:height`, `:alt`) | `https://set-game-qn3r.onrender.com/og-image.png`, `1960` × `1480` |
| `twitter:card` | `summary_large_image` |
| `twitter:title` / `twitter:description` / `twitter:image` | mirror the OG values |
| `<meta name="theme-color">` | `#6a2ca0` (matches the existing favicon purple) |

The canonical URL appears in `index.html`, `sitemap.xml`, `robots.txt`, and the
JSON-LD. It is hardcoded (per the decision to stay on the Render URL); moving to a
custom domain later means updating those four places plus a Search Console
change-of-address.

**Social image.** `public/og-image.png` is a copy of `docs/screenshots/start.png`
(1960×1480). The start screen reads better as a share card than a raw board. It is
4:3, not the ideal 1.91:1, so platforms will center-crop; neither ImageMagick nor
`sharp` is available locally to crop it properly. A purpose-built 1200×630 card is
a follow-up, not part of this work.

## 3. Crawl hygiene

`render.yaml` rewrites `/*` to `index.html` with a **200**. Every mistyped URL and
every `/r/CODE` room link is therefore an indexable duplicate of the homepage.

- **Fixed canonical.** Because exactly one real page exists, the hardcoded
  canonical above is correct on every response and collapses the whole spurious URL
  space onto the homepage.
- **Conditional noindex.** A small inline script in `<head>`, placed *before* the
  module script so it runs on first parse:

  ```html
  <script>
    if (location.pathname !== '/') {
      document.head.appendChild(
        Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' })
      );
    }
  </script>
  ```

  Googlebot executes JavaScript and honours a JS-injected `noindex`.

**`robots.txt` deliberately does *not* `Disallow: /r/`.** Disallow blocks
*crawling*, which would prevent the `noindex` above from ever being read, and a
blocked URL can still be indexed URL-only if someone links to it. Allowing the
crawl and serving `noindex` is the combination that actually keeps room links out
of the index.

## 4. Crawlable content section

Plain semantic HTML placed after `<div id="root">` in `index.html`, outside React —
present in the served source with no JS execution required. Wrapped in
`<section id="site-content">`, roughly 600 words. Production builds emit a real
`<link rel="stylesheet">` (Vite extracts the CSS that `main.tsx` imports), so the
section is styled without waiting on the bundle.

### Structure and copy

**H1 stays with the app** (the React `StartScreen` renders `<h1>Set</h1>`). The
static section uses `h2`/`h3` only, so the rendered document — which is what Google
indexes — has exactly one `h1`. The trade-off is that the *unrendered* HTML has no
`h1` at all. That is accepted deliberately: duplicating an `h1` into the static
section would give the rendered page two, and `<title>` is the stronger signal
either way.

**H2 — What is Set?**

> Set is a real-time pattern-recognition card game played with a special 81-card
> deck. Every card shows one, two, or three identical symbols, and each card is
> defined by four features: number, shape, shading, and color. The deck contains
> exactly one card for every possible combination — three options for each of the
> four features, so 3 × 3 × 3 × 3 = 81 cards, with no duplicates.

**H2 — How to play Set**

*H3 — The four features*

- **Number** — 1, 2, or 3 symbols
- **Shape** — diamond, squiggle, or oval
- **Shading** — solid, striped, or open (outline)
- **Color** — red, green, or purple

*H3 — What makes a valid Set*

> Three cards form a Set when, for each of the four features, the three cards are
> either all the same or all different. The features are judged independently:
> number can be all different while color is all the same, and the Set is still
> valid. If even one feature has two cards matching and a third that doesn't, it is
> not a Set.

*H3 — A worked example*

> **A valid Set:** one red solid diamond, two green solid diamonds, three purple
> solid diamonds. Number is all different (1, 2, 3). Color is all different (red,
> green, purple). Shape is all the same (diamond). Shading is all the same (solid).
> Every feature passes, so this is a Set.
>
> **Not a Set:** one red solid diamond, two red solid diamonds, three green solid
> diamonds. Number is all different, and shape and shading are all the same — but
> the colors are red, red, green. Two the same and one different fails the rule, so
> these three cards are not a Set.

**H2 — Single-player and multiplayer**

> In single-player, you clear the entire 81-card deck against the clock. A wrong
> pick adds 5 seconds to your time and a hint adds 15, so speed and accuracy both
> matter. Your best time is saved in your browser.
>
> In multiplayer, up to about twelve players share one live board and race to claim
> Sets. The first player to select a valid Set claims it, and those cards disappear
> for everyone at once; a wrong pick locks that player out for 5 seconds. When the
> deck is cleared, the highest score wins. Create a room, then share the room code
> or link to invite friends.

**H2 — Frequently asked questions** (seven `h3` questions + answers)

1. *Is this version of Set free?* — Yes. Runs entirely in your browser, free, no
   ads, no accounts.
2. *Do I need to sign up or install anything?* — No. Open the page and press Start.
   Multiplayer needs only a room code shared with friends.
3. *How many cards are in a Set deck?* — 81: one card for every combination of the
   four features, each with three values (3⁴ = 81).
4. *Is there always a Set on the board?* — In this version, yes. If the board
   contains no valid Set, three more cards are dealt automatically until one exists,
   so you are never stuck. (Matches `ensureSetOrDeal` in `src/game/engine.ts`.)
5. *Can I play Set online with friends?* — Yes. Choose Play with Friends, create a
   room, share the four-letter code or its link; everyone plays one board in real
   time.
6. *Does it work on a phone?* — Yes. The board and controls adapt to small screens
   (`src/index.css` has `max-width: 30rem` / `40rem` breakpoints).
7. *What do the time penalties mean?* — In single-player an incorrect trio adds 5
   seconds and a hint adds 15. Final time is elapsed time plus penalties. (Matches
   `WRONG_PENALTY_MS` / `HINT_PENALTY_MS`.)

**Attribution line** closing the section:

> This is a free fan-made implementation of the card game Set. It is not affiliated
> with or endorsed by the game's publisher.

Honest, and it keeps a page that deliberately targets a trademarked game name on
the right side of the line.

### Visibility

Visible on the start screen, hidden during play. `App` syncs an attribute on the
root element; CSS hides the section when the value is anything but `start`:

```tsx
useEffect(() => {
  const el = document.documentElement;
  el.dataset.appScreen = mode === 'multi' ? 'multi' : g.screen;
  return () => { delete el.dataset.appScreen; };
}, [mode, g.screen]);
```

The hook must sit **above** the existing `if (mode === 'multi')` early return in
`src/App.tsx` (line 46), alongside the other hooks.

```css
html[data-app-screen]:not([data-app-screen='start']) #site-content { display: none; }
```

The attribute is absent before JS runs, so the default state is *visible* — which is
what a crawler that does not render sees, and what Googlebot sees after rendering
(it lands on the start screen).

## 5. Structured data

One `application/ld+json` block in `index.html` using `@graph` with two nodes:

- **`VideoGame`** — `name`, `url`, `description`, `genre: ["Puzzle", "Card game"]`,
  `gamePlatform: "Web browser"`, `applicationCategory: "GameApplication"`,
  `playMode: ["SinglePlayer", "MultiPlayer"]`, `inLanguage: ["en", "zh-Hans"]`,
  `offers: { "@type": "Offer", "price": "0", "priceCurrency": "USD" }`.
- **`FAQPage`** — `mainEntity` mirroring the seven FAQ entries verbatim.

Expectation, stated plainly: Google restricted FAQ rich results to government and
health sites in 2023, so this will **not** produce FAQ snippets. It is included for
entity understanding. Structured data must match visible content, which §7 tests.

## 6. New `public/` directory

Vite copies `public/` to `dist/` automatically; no config change needed.

- **`public/robots.txt`** — `User-agent: *` / `Allow: /`, plus a `Sitemap:` line
  pointing at the canonical sitemap URL. No `Disallow` (see §3).
- **`public/sitemap.xml`** — a single `<url>` entry for the homepage, the only
  indexable page, with `lastmod`, `changefreq: monthly`, `priority: 1.0`.
- **`public/og-image.png`** — copy of `docs/screenshots/start.png`.

## 7. Testing

- **New `src/seo.test.ts`** — reads `index.html` from disk and parses it with
  `DOMParser` (the Vitest environment is already jsdom):
  - `<title>` is non-empty and ≤ 60 characters.
  - `meta[name=description]` exists and is 120–160 characters.
  - `link[rel=canonical]` equals the canonical URL.
  - `og:title`, `og:description`, `og:url`, `og:image`, and
    `twitter:card=summary_large_image` are all present.
  - The JSON-LD block parses as JSON and contains both a `VideoGame` and a
    `FAQPage` node.
  - **Drift guard:** every `FAQPage` question string appears as visible text in the
    `#site-content` FAQ headings, and the counts match. This is what stops the
    structured data and the rendered copy from silently diverging.
  - `#site-content` exists and contains at least four `h2` elements.
- **`src/App.test.tsx`** — after render, `document.documentElement` carries
  `data-app-screen="start"`; after starting a game it reads `playing`.
- Existing suites must stay green: `npm run typecheck && npm test && npm run build`.

## 8. Files touched

| File | Change |
|------|--------|
| `index.html` | metadata, JSON-LD, conditional-noindex script, `#site-content` section |
| `src/index.css` | `#site-content` styling + the hide-during-play rule |
| `src/App.tsx` | one `useEffect` syncing `data-app-screen` |
| `public/robots.txt` | new |
| `public/sitemap.xml` | new |
| `public/og-image.png` | new (copy of `docs/screenshots/start.png`) |
| `src/seo.test.ts` | new |
| `src/App.test.tsx` | assertion for the screen attribute |

No server changes. No `render.yaml` change — the SPA rewrite stays as it is, and
§3 handles its consequences at the document level.

## 9. Manual steps after deploy (cannot be done in code)

1. Verify the property in **Google Search Console** (DNS or the HTML-tag method —
   the tag can go in `index.html` if needed).
2. Submit `https://set-game-qn3r.onrender.com/sitemap.xml`.
3. Use **URL Inspection → Request indexing** for `/`.
4. Validate with the **Rich Results Test** and a social-card debugger.

Nothing here gets indexed quickly without steps 1–3, and rankings move on a scale of
weeks to months.

## 10. Non-goals

- **Chinese indexable content / `hreflang`.** The EN/中 toggle is runtime-only at a
  single URL, so the Chinese UI stays invisible to search. Fixing it needs separate
  URLs plus routing and prerendering — a larger piece of work, deliberately deferred.
  The static section is English-only, and `<html lang="en">` stays accurate.
- Prerendering or server-rendering the React app.
- A custom domain.
- A purpose-built 1200×630 social image (no local image tooling).
