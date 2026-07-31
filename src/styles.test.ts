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

const NARROW = '(max-width: 30rem)';

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

describe('in-game top bar', () => {
  it('is described by a single .topbar rule', () => {
    expect(bodiesIn(topLevel(), '.topbar')).toHaveLength(1);
    expect(body('.topbar')).toMatch(/display:\s*flex/);
    expect(body('.topbar')).toMatch(/justify-content:\s*center/);
    // The actions are positioned against it, so it has to be a containing block.
    expect(body('.topbar')).toMatch(/position:\s*relative/);
  });

  it('pins the actions beside the centred timer on a wide viewport', () => {
    expect(body('.topbar-actions')).toMatch(/position:\s*absolute/);
  });

  // Quit + ? + language select is ~10rem wide; pinned right of a centred timer
  // it overlaps the timer pill on a ~320px screen. Stack instead of overlapping.
  it('stacks the timer and actions on a narrow viewport', () => {
    const narrow = media(NARROW);
    expect(body('.topbar', narrow)).toMatch(/flex-direction:\s*column/);
    expect(body('.topbar', narrow)).toMatch(/align-items:\s*center/);
    expect(body('.topbar-actions', narrow)).toMatch(/position:\s*static/);
  });
});
