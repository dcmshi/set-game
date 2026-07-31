import { readFileSync } from 'node:fs';

// The path must stay a variable: Vite statically rewrites a literal
// `new URL('...', import.meta.url)` into an asset URL, which fs then rejects.
const CSS_PATH = './index.css';
const css = () => readFileSync(new URL(CSS_PATH, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Inside of the `@media <query>` block, so nested rules can be read on their own. */
function media(query: string): string {
  const source = css();
  const at = source.indexOf(`@media ${query}`);
  expect(at, `no @media ${query} block`).toBeGreaterThanOrEqual(0);
  const from = source.indexOf('{', at);
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(from + 1, i);
  }
  throw new Error(`unterminated @media ${query}`);
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

describe('in-game top bar', () => {
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
