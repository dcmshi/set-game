import { readFileSync } from 'node:fs';

const SITE_URL = 'https://set-game-qn3r.onrender.com/';
// The path must stay a variable: Vite statically rewrites a literal
// `new URL('...', import.meta.url)` into an asset URL, which fs then rejects.
const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const readBytes = (p: string) => readFileSync(new URL(p, import.meta.url));

const html = () => new DOMParser().parseFromString(read('../index.html'), 'text/html');
const meta = (doc: Document, sel: string) => doc.querySelector(sel)?.getAttribute('content') ?? '';

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

describe('index.html head metadata', () => {
  it("has a title within Google's display limit", () => {
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
    const note = html().querySelector('#site-content .site-content-note')!.textContent!;
    expect(note.replace(/\s+/g, ' ')).toMatch(/not affiliated with or endorsed by/i);
  });

  it('is styled without needing JavaScript', () => {
    expect(read('./index.css')).toContain('#site-content');
  });
});
