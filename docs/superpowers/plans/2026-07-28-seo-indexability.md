# SEO Indexability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Set site correctly indexable by Google and give it real, crawlable content to rank for long-tail queries.

**Architecture:** All SEO surface lives in the static `index.html` — head metadata, a JSON-LD block, and a ~600-word content section authored as plain HTML *outside* React, so it exists in the served source with no JS execution. Three new files under `public/` (copied to `dist/` by Vite automatically) supply `robots.txt`, `sitemap.xml`, and the social image. React's only involvement is one `useEffect` that syncs a `data-app-screen` attribute so the section hides during play.

**Tech Stack:** Vite 8, React 19, TypeScript, Vitest (jsdom environment — `DOMParser` is available in tests).

## Global Constraints

- **Canonical URL is `https://set-game-qn3r.onrender.com/`** — verbatim, with trailing slash, everywhere it appears (`index.html`, `robots.txt`, `sitemap.xml`, JSON-LD).
- **Title:** `Play Set Online — Free Speed Card Game, Solo or Multiplayer` (59 chars, must stay ≤ 60). The dash is an em dash `—`.
- **Description:** `Play Set free in your browser. Race the clock to clear all 81 cards solo, or challenge friends to grab Sets on a shared board in real time. No signup.` (must stay within 120–160 chars).
- **`robots.txt` must contain no `Disallow` line.** This is deliberate — see spec §3. Disallow blocks crawling, which would stop Google reading the `noindex` that keeps `/r/CODE` room links out of the index.
- **The static section uses `h2`/`h3` only** — the single `h1` belongs to React's `StartScreen`.
- **JSON-LD FAQ questions must match the visible FAQ headings verbatim.** Google requires structured data to reflect visible content; Task 4 enforces this with a test.
- Reuse existing CSS custom properties from `src/index.css` (`--text`, `--text-muted`, `--surface-border`, `--font-display`, `--radius-md`). Do not introduce new colors.
- All work on branch `feature/seo-indexability`. Never commit to `main` — pushing `main` deploys to Render production.
- `npm run typecheck && npm test && npm run build` must be green before the branch is done.

---

### Task 1: Static assets under `public/`

Vite copies `public/` to `dist/` at build time with no config change. The directory does not exist yet.

**Files:**
- Create: `public/robots.txt`
- Create: `public/sitemap.xml`
- Create: `public/og-image.png` (binary copy of `docs/screenshots/start.png`)
- Test: `src/seo.test.ts` (new — grows across Tasks 1–5)

**Interfaces:**
- Consumes: nothing.
- Produces: `src/seo.test.ts` with a `SITE_URL` constant (`export const SITE_URL = 'https://set-game-qn3r.onrender.com/'`) that later tasks import-free reuse within the same file, and a `read()` helper: `const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')` resolving paths relative to `src/`.

- [ ] **Step 1: Write the failing test**

Create `src/seo.test.ts`:

```ts
import { readFileSync } from 'node:fs';

const SITE_URL = 'https://set-game-qn3r.onrender.com/';
const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('static SEO assets', () => {
  it('robots.txt allows crawling and points at the sitemap', () => {
    const robots = read('../public/robots.txt');
    expect(robots).toMatch(/^User-agent:\s*\*/m);
    expect(robots).toMatch(/^Allow:\s*\//m);
    expect(robots).toContain(`Sitemap: ${SITE_URL}sitemap.xml`);
    // Deliberate: Disallow would block the crawl that reads our noindex.
    expect(robots).not.toMatch(/^Disallow:/m);
  });

  it('sitemap.xml lists exactly the canonical homepage', () => {
    const xml = read('../public/sitemap.xml');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    const locs = [...doc.querySelectorAll('url > loc')].map((n) => n.textContent);
    expect(locs).toEqual([SITE_URL]);
  });

  it('ships a non-empty social image', () => {
    const bytes = readFileSync(new URL('../public/og-image.png', import.meta.url));
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/seo.test.ts`
Expected: FAIL — `ENOENT: no such file or directory ... public/robots.txt`

- [ ] **Step 3: Create the three files**

`public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://set-game-qn3r.onrender.com/sitemap.xml
```

`public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://set-game-qn3r.onrender.com/</loc>
    <lastmod>2026-07-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

`public/og-image.png` — copy the binary, do not re-encode:

```bash
mkdir -p public && cp docs/screenshots/start.png public/og-image.png
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/seo.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add public src/seo.test.ts
git commit -m "feat(seo): robots.txt, sitemap.xml and social image"
```

---

### Task 2: Head metadata and conditional noindex

**Files:**
- Modify: `index.html:3-8` (the `<head>` block)
- Test: `src/seo.test.ts` (add a second `describe`)

**Interfaces:**
- Consumes: `SITE_URL` and `read()` from Task 1.
- Produces: a parsed-document helper later tasks reuse: `const html = () => new DOMParser().parseFromString(read('../index.html'), 'text/html')`. Define it at module scope next to `read`.

- [ ] **Step 1: Write the failing test**

Add to `src/seo.test.ts` — and move `html` up beside `read` at module scope:

```ts
const html = () => new DOMParser().parseFromString(read('../index.html'), 'text/html');
const meta = (doc: Document, sel: string) =>
  doc.querySelector(sel)?.getAttribute('content') ?? '';

describe('index.html head metadata', () => {
  it('has a title within Google\'s display limit', () => {
    const title = html().querySelector('title')!.textContent!;
    expect(title).toBe('Play Set Online — Free Speed Card Game, Solo or Multiplayer');
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it('has a description of a sensible length', () => {
    const d = meta(html(), 'meta[name="description"]');
    expect(d.length).toBeGreaterThanOrEqual(120);
    expect(d.length).toBeLessThanOrEqual(160);
  });

  it('declares the canonical URL', () => {
    expect(html().querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(SITE_URL);
  });

  it('has Open Graph and Twitter card tags mirroring the page', () => {
    const doc = html();
    const title = doc.querySelector('title')!.textContent;
    const desc = meta(doc, 'meta[name="description"]');
    expect(meta(doc, 'meta[property="og:type"]')).toBe('website');
    expect(meta(doc, 'meta[property="og:title"]')).toBe(title);
    expect(meta(doc, 'meta[property="og:description"]')).toBe(desc);
    expect(meta(doc, 'meta[property="og:url"]')).toBe(SITE_URL);
    expect(meta(doc, 'meta[property="og:image"]')).toBe(`${SITE_URL}og-image.png`);
    expect(meta(doc, 'meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(meta(doc, 'meta[name="twitter:title"]')).toBe(title);
    expect(meta(doc, 'meta[name="twitter:image"]')).toBe(`${SITE_URL}og-image.png`);
  });

  it('noindexes every path except the homepage', () => {
    const scripts = [...html().querySelectorAll('head script:not([src])')].map((s) => s.textContent ?? '');
    const guard = scripts.find((s) => s.includes('noindex'));
    expect(guard).toBeDefined();
    expect(guard).toContain("location.pathname !== '/'");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/seo.test.ts`
Expected: FAIL — title is still `Set — Speed Card Game`, canonical query returns null.

- [ ] **Step 3: Replace the `<head>` contents**

`index.html` — replace lines 3–8 (`<head>` through `</head>`) with:

```html
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Play Set Online — Free Speed Card Game, Solo or Multiplayer</title>
    <meta
      name="description"
      content="Play Set free in your browser. Race the clock to clear all 81 cards solo, or challenge friends to grab Sets on a shared board in real time. No signup."
    />
    <link rel="canonical" href="https://set-game-qn3r.onrender.com/" />
    <meta name="theme-color" content="#6a2ca0" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Set — Speed Card Game" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:title" content="Play Set Online — Free Speed Card Game, Solo or Multiplayer" />
    <meta
      property="og:description"
      content="Play Set free in your browser. Race the clock to clear all 81 cards solo, or challenge friends to grab Sets on a shared board in real time. No signup."
    />
    <meta property="og:url" content="https://set-game-qn3r.onrender.com/" />
    <meta property="og:image" content="https://set-game-qn3r.onrender.com/og-image.png" />
    <meta property="og:image:width" content="1960" />
    <meta property="og:image:height" content="1480" />
    <meta property="og:image:alt" content="The Set start screen, showing the game logo and rules summary" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Play Set Online — Free Speed Card Game, Solo or Multiplayer" />
    <meta
      name="twitter:description"
      content="Play Set free in your browser. Race the clock to clear all 81 cards solo, or challenge friends to grab Sets on a shared board in real time. No signup."
    />
    <meta name="twitter:image" content="https://set-game-qn3r.onrender.com/og-image.png" />

    <!--
      The Render SPA rewrite serves this file with a 200 for every path, so any
      URL other than / is a duplicate of the homepage. The canonical above
      collapses them; this marks room links (/r/CODE) and typos noindex.
      Googlebot runs JS and honours a JS-injected noindex. Note robots.txt does
      NOT disallow these paths — a blocked crawl would never read this tag.
    -->
    <script>
      if (location.pathname !== '/') {
        document.head.appendChild(
          Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' })
        );
      }
    </script>

    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M16 2 L30 16 L16 30 L2 16 Z' fill='%236a2ca0'/%3E%3C/svg%3E" />
  </head>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/seo.test.ts`
Expected: PASS (8 tests)

If the description length assertion fails, check for a stray newline — the `content` attribute is on one line in the source above; HTML attribute values spanning lines would fold whitespace into the string.

- [ ] **Step 5: Commit**

```bash
git add index.html src/seo.test.ts
git commit -m "feat(seo): head metadata, canonical and conditional noindex"
```

---

### Task 3: Static crawlable content section

**Files:**
- Modify: `index.html` (add `<section id="site-content">` after `<div id="root"></div>`)
- Modify: `src/index.css` (append a `#site-content` block at the end of the file)
- Test: `src/seo.test.ts`

**Interfaces:**
- Consumes: `read()`, `html()` from Tasks 1–2.
- Produces: the DOM structure Task 4's drift guard reads — FAQ questions are the `h3` elements inside `<section id="site-faq">`, and their `textContent` is the exact question string.

- [ ] **Step 1: Write the failing test**

Add to `src/seo.test.ts`:

```ts
describe('crawlable content section', () => {
  it('exists in the served HTML, outside the React root', () => {
    const doc = html();
    const section = doc.querySelector('#site-content');
    expect(section).not.toBeNull();
    expect(doc.querySelector('#root')!.contains(section!)).toBe(false);
  });

  it('covers the four topic areas and keeps a single h1 for the app', () => {
    const doc = html();
    const h2s = [...doc.querySelectorAll('#site-content h2')].map((h) => h.textContent!.trim());
    expect(h2s).toEqual([
      'What is Set?',
      'How to play Set',
      'Single-player and multiplayer',
      'Frequently asked questions',
    ]);
    expect(doc.querySelectorAll('#site-content h1')).toHaveLength(0);
  });

  it('asks seven FAQ questions, each with an answer', () => {
    const faq = html().querySelector('#site-faq')!;
    expect(faq.querySelectorAll('h3')).toHaveLength(7);
    expect(faq.querySelectorAll('h3 + p')).toHaveLength(7);
  });

  it('states that it is an unofficial implementation', () => {
    expect(html().querySelector('#site-content .site-content-note')!.textContent)
      .toMatch(/not affiliated with or endorsed by/i);
  });

  it('is styled without needing JavaScript', () => {
    expect(read('./index.css')).toContain('#site-content');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/seo.test.ts`
Expected: FAIL — `#site-content` is null.

- [ ] **Step 3: Add the section to `index.html`**

In `index.html`, directly after `<div id="root"></div>` and before the module `<script>`:

```html
    <section id="site-content">
      <h2>What is Set?</h2>
      <p>
        Set is a real-time pattern-recognition card game played with a special 81-card deck.
        Every card shows one, two, or three identical symbols, and each card is defined by four
        features: number, shape, shading, and color. The deck contains exactly one card for
        every possible combination — three options for each of the four features, so
        3 × 3 × 3 × 3 = 81 cards, with no duplicates.
      </p>

      <h2>How to play Set</h2>
      <h3>The four features</h3>
      <ul>
        <li><strong>Number</strong> — 1, 2, or 3 symbols</li>
        <li><strong>Shape</strong> — diamond, squiggle, or oval</li>
        <li><strong>Shading</strong> — solid, striped, or open (outline)</li>
        <li><strong>Color</strong> — red, green, or purple</li>
      </ul>
      <h3>What makes a valid Set</h3>
      <p>
        Three cards form a Set when, for each of the four features, the three cards are either
        all the same or all different. The features are judged independently: number can be all
        different while color is all the same, and the Set is still valid. If even one feature
        has two cards matching and a third that doesn't, it is not a Set.
      </p>
      <h3>A worked example</h3>
      <p>
        <strong>A valid Set:</strong> one red solid diamond, two green solid diamonds, three
        purple solid diamonds. Number is all different (1, 2, 3). Color is all different (red,
        green, purple). Shape is all the same (diamond). Shading is all the same (solid). Every
        feature passes, so this is a Set.
      </p>
      <p>
        <strong>Not a Set:</strong> one red solid diamond, two red solid diamonds, three green
        solid diamonds. Number is all different, and shape and shading are all the same — but
        the colors are red, red, green. Two the same and one different fails the rule, so these
        three cards are not a Set.
      </p>

      <h2>Single-player and multiplayer</h2>
      <p>
        In single-player, you clear the entire 81-card deck against the clock. A wrong pick adds
        5 seconds to your time and a hint adds 15, so speed and accuracy both matter. Your best
        time is saved in your browser.
      </p>
      <p>
        In multiplayer, up to about twelve players share one live board and race to claim Sets.
        The first player to select a valid Set claims it, and those cards disappear for everyone
        at once; a wrong pick locks that player out for 5 seconds. When the deck is cleared, the
        highest score wins. Create a room, then share the room code or link to invite friends.
      </p>

      <h2>Frequently asked questions</h2>
      <div id="site-faq">
        <h3>Is this version of Set free?</h3>
        <p>Yes. The game runs entirely in your browser, it is free, and there are no ads or accounts.</p>

        <h3>Do I need to sign up or install anything?</h3>
        <p>
          No. Open the page and press Start. Multiplayer needs nothing more than a room code
          shared with your friends.
        </p>

        <h3>How many cards are in a Set deck?</h3>
        <p>
          81 — one card for every possible combination of the four features, each with three
          possible values (3⁴ = 81).
        </p>

        <h3>Is there always a Set on the board?</h3>
        <p>
          In this version, yes. If the cards on the board contain no valid Set, three more are
          dealt automatically until one exists, so you are never stuck.
        </p>

        <h3>Can I play Set online with friends?</h3>
        <p>
          Yes. Choose Play with Friends, create a room, and share the four-letter room code or
          its link. Everyone plays the same board in real time.
        </p>

        <h3>Does it work on a phone?</h3>
        <p>
          Yes. The board and controls adapt to small screens, so you can play on a phone or
          tablet in the browser.
        </p>

        <h3>What do the time penalties mean?</h3>
        <p>
          In single-player, an incorrect trio adds 5 seconds to your clock and using a hint adds
          15 seconds. Your final time is your elapsed time plus penalties.
        </p>
      </div>

      <p class="site-content-note">
        This is a free fan-made implementation of the card game Set. It is not affiliated with
        or endorsed by the game's publisher.
      </p>
    </section>
```

- [ ] **Step 4: Append styles to `src/index.css`**

Append at the end of the file (after the `.danger-btn:hover` block):

```css
/* -------------------------------------------------------------------------
   #site-content — static, crawlable page copy that lives in index.html rather
   than React, so it is present in the served source before any JS runs.
   Sits below the app (which is min-height: 100vh), so it is below the fold.
   ---------------------------------------------------------------------- */
#site-content {
  max-width: 44rem;
  margin: 0 auto;
  padding: 3rem 1.5rem 4rem;
  color: var(--text);
  line-height: 1.65;
}
#site-content h2 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 2.5rem 0 0.75rem;
}
#site-content h2:first-of-type {
  margin-top: 0;
}
#site-content h3 {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  margin: 1.5rem 0 0.4rem;
}
#site-content p {
  margin: 0 0 0.9rem;
}
#site-content ul {
  margin: 0 0 0.9rem;
  padding-left: 1.25rem;
}
#site-content li {
  margin-bottom: 0.3rem;
}
#site-content .site-content-note {
  margin-top: 2.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--surface-border);
  font-size: 0.85rem;
  color: var(--text-muted);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/seo.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 6: Commit**

```bash
git add index.html src/index.css src/seo.test.ts
git commit -m "feat(seo): static crawlable rules and FAQ content section"
```

---

### Task 4: JSON-LD structured data with a drift guard

**Files:**
- Modify: `index.html` (add one `<script type="application/ld+json">` at the end of `<head>`)
- Test: `src/seo.test.ts`

**Interfaces:**
- Consumes: `html()` from Task 2; the `#site-faq` `h3` structure from Task 3.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing test**

Add to `src/seo.test.ts`:

```ts
const jsonLd = () => {
  const el = html().querySelector('script[type="application/ld+json"]')!;
  return JSON.parse(el.textContent!) as { '@graph': Record<string, any>[] };
};
const node = (type: string) => jsonLd()['@graph'].find((n) => n['@type'] === type)!;

describe('structured data', () => {
  it('parses as valid JSON-LD with a @graph', () => {
    expect(jsonLd()['@graph']).toBeInstanceOf(Array);
  });

  it('describes the game as a free, browser-based VideoGame', () => {
    const g = node('VideoGame');
    expect(g.url).toBe(SITE_URL);
    expect(g.playMode).toEqual(['SinglePlayer', 'MultiPlayer']);
    expect(g.gamePlatform).toBe('Web browser');
    expect(g.offers.price).toBe('0');
  });

  // Google requires structured data to reflect what users actually see.
  // This is the guard that stops the JSON-LD and the visible copy diverging.
  it('mirrors the visible FAQ exactly', () => {
    const visible = [...html().querySelectorAll('#site-faq h3')].map((h) => h.textContent!.trim());
    const structured = node('FAQPage').mainEntity.map((q: { name: string }) => q.name);
    expect(structured).toEqual(visible);
  });

  it('gives every FAQ entry a non-empty answer', () => {
    for (const q of node('FAQPage').mainEntity) {
      expect(q.acceptedAnswer.text.length).toBeGreaterThan(20);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/seo.test.ts`
Expected: FAIL — `Cannot read properties of null (reading 'textContent')`, no JSON-LD script yet.

- [ ] **Step 3: Add the JSON-LD block**

In `index.html`, immediately before `</head>`:

```html
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "VideoGame",
            "name": "Set — Speed Card Game",
            "url": "https://set-game-qn3r.onrender.com/",
            "description": "A free browser version of the card game Set. Clear all 81 cards solo against the clock, or race friends on a shared board in real time.",
            "genre": ["Puzzle", "Card game"],
            "gamePlatform": "Web browser",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any (web browser)",
            "playMode": ["SinglePlayer", "MultiPlayer"],
            "inLanguage": ["en", "zh-Hans"],
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
          },
          {
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Is this version of Set free?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes. The game runs entirely in your browser, it is free, and there are no ads or accounts."
                }
              },
              {
                "@type": "Question",
                "name": "Do I need to sign up or install anything?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "No. Open the page and press Start. Multiplayer needs nothing more than a room code shared with your friends."
                }
              },
              {
                "@type": "Question",
                "name": "How many cards are in a Set deck?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "81 — one card for every possible combination of the four features, each with three possible values (3⁴ = 81)."
                }
              },
              {
                "@type": "Question",
                "name": "Is there always a Set on the board?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "In this version, yes. If the cards on the board contain no valid Set, three more are dealt automatically until one exists, so you are never stuck."
                }
              },
              {
                "@type": "Question",
                "name": "Can I play Set online with friends?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes. Choose Play with Friends, create a room, and share the four-letter room code or its link. Everyone plays the same board in real time."
                }
              },
              {
                "@type": "Question",
                "name": "Does it work on a phone?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes. The board and controls adapt to small screens, so you can play on a phone or tablet in the browser."
                }
              },
              {
                "@type": "Question",
                "name": "What do the time penalties mean?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "In single-player, an incorrect trio adds 5 seconds to your clock and using a hint adds 15 seconds. Your final time is your elapsed time plus penalties."
                }
              }
            ]
          }
        ]
      }
    </script>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/seo.test.ts`
Expected: PASS (17 tests)

If the FAQ-mirror test fails, diff the two arrays it prints — the `name` values must match the `h3` text character for character, including the `?`.

- [ ] **Step 5: Commit**

```bash
git add index.html src/seo.test.ts
git commit -m "feat(seo): VideoGame and FAQPage structured data"
```

---

### Task 5: Hide the content section during play

**Files:**
- Modify: `src/App.tsx:1` (add `useEffect` to the React import) and after the `closeHowTo` callback at `src/App.tsx:43`
- Modify: `src/index.css` (one rule appended after the `#site-content` block)
- Test: `src/App.test.tsx`, `src/seo.test.ts`

**Interfaces:**
- Consumes: the `#site-content` section from Task 3.
- Produces: `document.documentElement.dataset.appScreen`, one of `'start' | 'playing' | 'won' | 'multi'`.

- [ ] **Step 1: Write the failing tests**

Add to `src/App.test.tsx`:

```tsx
it('tracks the current screen on the root element so static copy can hide', async () => {
  render(<App seed={5} />);
  expect(document.documentElement.dataset.appScreen).toBe('start');
  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  expect(document.documentElement.dataset.appScreen).toBe('playing');
});
```

Add to `src/seo.test.ts`, inside the `crawlable content section` describe:

```ts
it('hides the static copy once the app leaves the start screen', () => {
  const css = read('./index.css').replace(/\s+/g, ' ');
  expect(css).toContain("html[data-app-screen]:not([data-app-screen='start']) #site-content");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/App.test.tsx src/seo.test.ts`
Expected: FAIL — `expected undefined to be 'start'`, and the CSS selector is absent.

- [ ] **Step 3: Add the effect to `src/App.tsx`**

Change the first import line to include `useEffect`:

```tsx
import { useCallback, useEffect, useState } from 'react';
```

Then insert this **above** the `// All hooks are declared above this point` comment and its `if (mode === 'multi')` early return — the hook must run on every render:

```tsx
  // Mirror the current screen onto <html> so the static #site-content section in
  // index.html (which React does not own) can hide itself while a game is on.
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.appScreen = mode === 'multi' ? 'multi' : g.screen;
    return () => {
      delete el.dataset.appScreen;
    };
  }, [mode, g.screen]);
```

- [ ] **Step 4: Add the CSS rule**

Append to `src/index.css`, directly after the `#site-content .site-content-note` block:

```css
/* Absent before JS runs, so the default — and what a non-rendering crawler
   sees — is visible. React sets it to 'start' on mount. */
html[data-app-screen]:not([data-app-screen='start']) #site-content {
  display: none;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/App.test.tsx src/seo.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/index.css src/seo.test.ts
git commit -m "feat(seo): hide static content section during play"
```

---

### Task 6: Full verification

No new behavior — this task proves the whole change holds together and that the build actually emits what Google will fetch.

**Files:**
- Test: none new; runs the existing suites and inspects `dist/`.

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: nothing.

- [ ] **Step 1: Run typecheck and the full suite**

Run: `npm run typecheck && npm test`
Expected: PASS, with no regressions in the existing client or server tests.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: builds to `dist/` with no errors.

- [ ] **Step 3: Verify the built output**

Run:

```bash
ls dist/robots.txt dist/sitemap.xml dist/og-image.png
grep -c 'site-content' dist/index.html
grep -c 'application/ld+json' dist/index.html
grep -o '<link rel="stylesheet"[^>]*>' dist/index.html
```

Expected: all three files exist; both greps return `1`; a real `<link rel="stylesheet">` is present (this is what styles `#site-content` without JS).

- [ ] **Step 4: Confirm the section survives with JS disabled**

Run: `npm run preview`, open the preview URL with JavaScript disabled in devtools, and confirm the rules and FAQ text render styled. Then re-enable JS and confirm the section is visible on the start screen and disappears after pressing Start.

- [ ] **Step 5: Commit any fixes**

Only if steps 1–4 surfaced problems:

```bash
git add -A
git commit -m "fix(seo): address verification findings"
```

---

## Post-merge manual steps (cannot be done in code)

These are the difference between "deployed" and "indexed". Nothing here happens automatically.

1. Merge `feature/seo-indexability` to `main` — this deploys to Render production.
2. Verify the property in **Google Search Console** (DNS, or the HTML-tag method — the tag goes in `index.html`).
3. Submit `https://set-game-qn3r.onrender.com/sitemap.xml`.
4. **URL Inspection → Request indexing** for `/`.
5. Validate with the **Rich Results Test** and a social-card debugger.

Rankings move over weeks to months, not days.
