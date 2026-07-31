import { readFileSync } from 'node:fs';

// The path must stay a variable: Vite statically rewrites a literal
// `new URL('...', import.meta.url)` into an asset URL, which fs then rejects.
const CSS_PATH = './index.css';
const css = () => readFileSync(new URL(CSS_PATH, import.meta.url), 'utf8');

/** Declaration bodies of every rule whose selector list is exactly `selector`. */
function bodies(selector: string): string[] {
  const stripped = css().replace(/\/\*[\s\S]*?\*\//g, '');
  const out: string[] = [];
  for (const [, sel, body] of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (sel.trim() === selector) out.push(body.trim());
  }
  return out;
}

const body = (selector: string): string => {
  const found = bodies(selector);
  expect(found, `no rule found for ${selector}`).not.toHaveLength(0);
  return found.join('\n');
};

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
