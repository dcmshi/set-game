import { readFileSync } from 'node:fs';

const SITE_URL = 'https://set-game-qn3r.onrender.com/';
// The path must stay a variable: Vite statically rewrites a literal
// `new URL('...', import.meta.url)` into an asset URL, which fs then rejects.
const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const readBytes = (p: string) => readFileSync(new URL(p, import.meta.url));

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
    const bytes = readBytes('../public/og-image.png');
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  });
});
