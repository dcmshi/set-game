import { readFileSync } from 'node:fs';

// The path must stay a variable: Vite statically rewrites a literal
// `new URL('...', import.meta.url)` into an asset URL, which fs then rejects.
const CSS_PATH = './index.css';
const css = () => readFileSync(new URL(CSS_PATH, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Contents of every `@media <query>` block, so nested rules can be read on their own. */
function media(query: string): string {
  const source = css();
  const needle = `@media ${query}`;
  const parts: string[] = [];
  for (let at = source.indexOf(needle); at >= 0; at = source.indexOf(needle, at + 1)) {
    const from = source.indexOf('{', at);
    let depth = 0;
    for (let i = from; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}' && --depth === 0) {
        parts.push(source.slice(from + 1, i));
        break;
      }
    }
  }
  expect(parts, `no @media ${query} block`).not.toHaveLength(0);
  return parts.join('\n');
}

/** Everything outside any at-rule block, so top-level lookups ignore overrides. */
function topLevel(): string {
  const source = css();
  let out = '';
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== '@') {
      out += source[i];
      continue;
    }
    const from = source.indexOf('{', i);
    if (from < 0) break;
    let depth = 0;
    for (let j = from; j < source.length; j++) {
      if (source[j] === '{') depth++;
      else if (source[j] === '}' && --depth === 0) {
        i = j;
        break;
      }
    }
  }
  return out;
}

/** Declaration bodies of rules in `source` whose selector list is exactly `selector`. */
function bodiesIn(source: string, selector: string): string[] {
  const out: string[] = [];
  for (const [, sel, decls] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (sel.trim() === selector) out.push(decls.trim());
  }
  return out;
}

function body(selector: string, source: string = topLevel()): string {
  const found = bodiesIn(source, selector);
  expect(found, `no rule found for ${selector}`).not.toHaveLength(0);
  return found.join('\n');
}

/** Selector lists of every rule in `source`, at-rule preludes included. */
function selectors(source: string): string[] {
  return [...source.matchAll(/([^{}]+)\{/g)].map(([, sel]) => sel.trim());
}

const hoverSelectors = (source: string) => selectors(source).filter((s) => s.includes(':hover')).sort();

/* ---------------------------------------------------------------------------
   Resolving a declaration the way a browser would

   Asserting that a media block *contains* an override says nothing about
   whether it wins: a later rule of equal specificity beats it. That gap let the
   narrow top-bar rules sit above `.topbar-actions` and never apply, so the
   actions stayed pinned over the timer on every phone.

   Lookup is by exact selector text, so every candidate rule has identical
   specificity by construction and the last match wins outright. That is the
   whole cascade model here — a declaration reaching the element through some
   other selector is out of scope.
   ------------------------------------------------------------------------ */

interface Env {
  width: number;
  hover?: boolean;
  scheme?: 'light' | 'dark';
  reducedMotion?: boolean;
}

/** Media queries resolve rem against the initial 16px, not the root font-size. */
function toPx(length: string): number {
  const [, n, unit] = length.trim().match(/^([\d.]+)(rem|em|px)$/) ?? [];
  if (!n) throw new Error(`unsupported media length: ${length}`);
  return unit === 'px' ? Number(n) : Number(n) * 16;
}

/**
 * Throws on any feature it does not model rather than silently failing to
 * match, so a new kind of media query cannot quietly rot these assertions.
 */
function matches(query: string, env: Env): boolean {
  return query.split(/\s+and\s+/).every((clause) => {
    const [, feature, value] = clause.trim().match(/^\(([\w-]+):\s*([^)]+)\)$/) ?? [];
    if (!feature) throw new Error(`unsupported media query: ${clause}`);
    switch (feature) {
      case 'max-width':
        return env.width <= toPx(value);
      case 'min-width':
        return env.width >= toPx(value);
      case 'hover':
        return (env.hover ?? true) === (value.trim() === 'hover');
      case 'prefers-color-scheme':
        return (env.scheme ?? 'light') === value.trim();
      case 'prefers-reduced-motion':
        return (env.reducedMotion ?? false) === (value.trim() === 'reduce');
      default:
        throw new Error(`unsupported media feature: ${feature}`);
    }
  });
}

/** Every rule in the sheet, in source order, tagged with the query guarding it. */
function orderedRules(): { selector: string; decls: string; query: string | null }[] {
  const source = css();
  const out: { selector: string; decls: string; query: string | null }[] = [];
  for (const [, prelude, block] of source.matchAll(/([^{}]+)\{((?:[^{}]|\{[^{}]*\})*)\}/g)) {
    const selector = prelude.trim();
    if (!selector.startsWith('@media')) {
      out.push({ selector, decls: block, query: null });
      continue;
    }
    const query = selector.slice('@media'.length).trim();
    for (const [, nested, decls] of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      out.push({ selector: nested.trim(), decls, query });
    }
  }
  return out;
}

/** The winning value of `prop` on `selector` at `env`, or undefined if unset. */
function resolve(selector: string, prop: string, env: Env): string | undefined {
  let winner: string | undefined;
  for (const rule of orderedRules()) {
    if (rule.selector !== selector) continue;
    if (rule.query !== null && !matches(rule.query, env)) continue;
    for (const [, value] of rule.decls.matchAll(new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`, 'g'))) {
      winner = value.trim();
    }
  }
  return winner;
}

const at = (width: number) => ({
  value: (selector: string, prop: string) => resolve(selector, prop, { width }),
});

/** Widths either side of the 30rem breakpoint, which matches at exactly 480px. */
const PHONE_WIDTHS = [320, 390, 430, 480];
const WIDE_WIDTHS = [481, 900];

describe('card deal-in animation', () => {
  // A retained animation value wins over the normal cascade, so an animation
  // that keeps its final transform makes every later transform rule dead.
  it('releases its transform so the hover lift applies', () => {
    expect(body('.card')).toMatch(/animation:\s*deal-in[^;]*\bbackwards\b/);
    expect(body('.card')).not.toMatch(/animation:[^;]*\bboth\b/);
  });

  it('releases its transform on hinted cards too', () => {
    expect(body('.card.hinted')).toMatch(/animation:[^;]*deal-in[^;]*\bbackwards\b/);
    expect(body('.card.hinted')).not.toMatch(/animation:[^;]*\bboth\b/);
  });
});

// --text-muted (0.64 alpha) and --text-soft (0.62) were indistinguishable in
// the light theme, so secondary text is one tier rather than two.
it('has a single token for secondary text', () => {
  expect(css()).not.toContain('--text-soft');
  expect(css()).toContain('--text-muted');
});

// A tap on a touch screen leaves the tapped element in :hover until something
// else is tapped, so an unguarded hover style reads as stuck-on to the user.
it('puts every hover style behind a (hover: hover) query', () => {
  const guarded = hoverSelectors(media('(hover: hover)'));
  expect(guarded).not.toHaveLength(0);
  expect(guarded).toEqual(hoverSelectors(css()));
});

describe('suit colours', () => {
  it('reaches the shapes through the inherited colour of each suit class', () => {
    for (const suit of ['red', 'green', 'purple']) {
      expect(body(`.color-${suit}`)).toBe(`color: var(--suit-${suit});`);
      expect(body(`.stripe-${suit}`)).toBe(`stroke: var(--suit-${suit});`);
    }
  });

  it('offers a colourblind palette that replaces only the suit tokens', () => {
    const swapped = body(":root[data-palette='colorblind']");
    for (const suit of ['red', 'green', 'purple']) {
      expect(swapped).toMatch(new RegExp(`--suit-${suit}:\\s*#`));
    }
    // Remapping --red itself would recolour the wrong-guess outline, the error
    // text and the danger button, none of which are suits.
    expect(swapped).not.toMatch(/(^|[^-])--(red|green|purple):/);
  });
});

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
    const declaring = selectors(css())
      .filter((s) => bodiesIn(css(), s).some((d) => /(^|;)\s*color-scheme:/.test(d)))
      .sort();
    expect(declaring).toEqual([':root', ":root[data-theme='dark']", ":root[data-theme='light']"]);
  });

  it('lets an explicit choice pin the scheme in either direction', () => {
    expect(body(':root')).toMatch(/color-scheme:\s*light dark/);
    expect(body(":root[data-theme='light']")).toBe('color-scheme: light;');
    expect(body(":root[data-theme='dark']")).toBe('color-scheme: dark;');
  });
});

describe('start-screen brand glyphs', () => {
  // clip-path clips an outline along with the rest of the element, so a rim
  // drawn that way survived only as four slivers at the diamond's tips.
  it('draws each rim as a clipped layer rather than an outline', () => {
    for (const selector of selectors(css()).filter((s) => s.startsWith('.glyph'))) {
      expect(body(selector), selector).not.toMatch(/outline/);
    }
    expect(body('.glyph')).toMatch(/background:\s*currentColor/);
  });

  // The open glyph had no interior of its own, so it took the colour of the
  // screen behind it while the striped one beside it showed cardstock.
  it('gives all three the same cardstock interior', () => {
    expect(body('.glyph::after')).toMatch(/background:\s*var\(--card-bg\)/);
    expect(body('.glyph-open')).toBe('color: var(--suit-purple);');
  });
});

describe('in-game top bar', () => {
  it('is described by a single .topbar rule', () => {
    expect(bodiesIn(topLevel(), '.topbar')).toHaveLength(1);
    expect(body('.topbar')).toMatch(/display:\s*flex/);
    expect(body('.topbar')).toMatch(/justify-content:\s*center/);
    // The actions are positioned against it, so it has to be a containing block.
    expect(body('.topbar')).toMatch(/position:\s*relative/);
  });

  it('pins the actions beside the centred timer on a wide viewport', () => {
    for (const width of WIDE_WIDTHS) {
      expect(at(width).value('.topbar-actions', 'position'), `at ${width}px`).toBe('absolute');
    }
  });

  // Quit + ? + palette + language is 243px wide (263px in French) against a
  // 288px content box at 320px. Pinned right of a centred timer it buries the
  // timer pill, so the two stack on a phone instead of overlapping.
  it('stacks the timer and actions on a narrow viewport', () => {
    for (const width of PHONE_WIDTHS) {
      expect(at(width).value('.topbar', 'flex-direction'), `at ${width}px`).toBe('column');
      expect(at(width).value('.topbar', 'align-items'), `at ${width}px`).toBe('center');
    }
  });

  // Taking the actions out of flow is what lets them cover the timer, so the
  // stack above only holds while nothing in the bar is positioned.
  it('keeps the actions in flow on a narrow viewport, so they cannot cover the timer', () => {
    for (const width of PHONE_WIDTHS) {
      expect(at(width).value('.topbar-actions', 'position'), `at ${width}px`).toBe('static');
      expect(at(width).value('.topbar-actions', 'transform'), `at ${width}px`).toBe('none');
    }
  });

  // Quit + theme + ? + palette + language is ~286px in English and ~306px in
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
});

describe('board at narrow viewports', () => {
  it('drops to three columns on a phone and keeps four above the breakpoint', () => {
    for (const width of PHONE_WIDTHS) {
      expect(at(width).value('.board', 'grid-template-columns'), `at ${width}px`).toBe('repeat(3, 1fr)');
    }
    for (const width of WIDE_WIDTHS) {
      expect(at(width).value('.board', 'grid-template-columns'), `at ${width}px`).toBe('repeat(4, 1fr)');
    }
  });
});
