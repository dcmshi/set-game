import { readFileSync } from 'node:fs';
import { LANGS } from './i18n/detectLang';

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

  // Google re-checks this file periodically and unverifies the Search Console
  // property if it stops resolving, so it has to keep its exact filename.
  it('serves the Search Console verification file under its declared name', () => {
    const name = 'google2b9f6e0ac5009e7b.html';
    expect(read(`../public/${name}`).trim()).toBe(`google-site-verification: ${name}`);
  });

  // Google only shows a favicon in results if Googlebot-Image can crawl it,
  // so it has to stay a real file at a real path — never a data: URI.
  it('ships a crawlable favicon file', () => {
    const href = html().querySelector('link[rel="icon"]')!.getAttribute('href')!;
    expect(href).not.toMatch(/^data:/);
    expect(href).toBe('/favicon.svg');
    const svg = read(`../public${href}`);
    expect(svg).toContain('<svg');
    // Square, and sized for the 48px grid Google asks for.
    expect(svg).toMatch(/width="48"/);
    expect(svg).toMatch(/height="48"/);
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

  const guardScript = () => {
    const scripts = [...html().querySelectorAll('head script:not([src])')].map((s) => s.textContent ?? '');
    return scripts.find((s) => s.includes('noindex'));
  };

  it('noindexes every path except the homepage', () => {
    const guard = guardScript();
    expect(guard).toBeDefined();
    expect(guard).toContain("location.pathname !== '/'");
  });

  // noindex plus a canonical pointing at / are contradictory signals, and
  // Google resolves that pair by honouring the canonical — silently undoing
  // the noindex. The guard must strip the canonical on those paths.
  it('drops the canonical wherever it applies the noindex', () => {
    expect(guardScript()).toContain('link[rel="canonical"]');
  });

  it('runs the guard synchronously, so a crawler never sees the head mid-fix', () => {
    const guard = [...html().querySelectorAll('head script:not([src])')].find((s) =>
      (s.textContent ?? '').includes('noindex'),
    )!;
    expect(guard.hasAttribute('async')).toBe(false);
    expect(guard.hasAttribute('defer')).toBe(false);
    expect(guard.hasAttribute('type')).toBe(false);
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

  it('opens with a link back to the game', () => {
    const first = html().querySelector('#site-content')!.firstElementChild!;
    expect(first.tagName).toBe('A');
    expect(first.getAttribute('href')).toBe('#root');
    expect(first.textContent!.replace(/\s+/g, ' ').trim()).toBe('Back to game');
  });

  // This section is English by prior decision, but the app now rewrites the
  // document language to whatever the player is using. Without a lang of its
  // own, the English prose inherits e.g. lang="ja" and is announced in Japanese.
  it('declares its own language, since the document language follows the UI', () => {
    expect(html().querySelector('#site-content')!.getAttribute('lang')).toBe('en');
  });

  it('scrolls smoothly, except for readers who asked for less motion', () => {
    const css = read('./index.css');
    expect(css).toContain('scroll-behavior: smooth');
    // scroll-behavior is neither an animation nor a transition, so the existing
    // reduced-motion block does not cover it — it needs its own override.
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced.slice(0, 400)).toContain('scroll-behavior: auto');
  });

  it('is styled without needing JavaScript', () => {
    expect(read('./index.css')).toContain('#site-content');
  });
});

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

  // Adding a language to the UI must not leave the structured data behind.
  it('declares every language the UI actually ships in', () => {
    const declared = (node('VideoGame').inLanguage as string[]).map((tag) => tag.split('-')[0]);
    expect(declared.sort()).toEqual([...LANGS].sort());
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

it('hides the static copy once the app leaves the start screen', () => {
  const css = read('./index.css').replace(/\s+/g, ' ');
  expect(css).toContain("html[data-app-screen]:not([data-app-screen='start']) #site-content");
});
