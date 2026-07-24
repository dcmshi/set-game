# How-to-Play Tutorial + Chinese Language Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a detailed "How to Play" tutorial (real example cards) and an English⇄Simplified-Chinese language toggle covering every user-facing string.

**Architecture:** A zero-dependency i18n layer (`src/i18n/`): one typed `{ en, zh }` dictionary, a `LanguageProvider` React context with a `useT()` hook, auto-detect-then-persist language. The tutorial is an overlay modal reusing extracted card visuals (`CardFace`). Opening it mid-game pauses the clock via a single source-of-truth in `useGame`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library. No new dependencies.

## Global Constraints

- **No new npm dependencies.** i18n is hand-rolled on React context.
- **Simplified Chinese only** (variant zh). English is the fallback for any missing key.
- **Persistence key:** `set-game:lang`; wrap all `localStorage` access in try/catch (mirror `src/storage/bestTime.ts`).
- **Default language:** stored value if present, else `navigator.language.startsWith('zh')` → `zh`, else `en`.
- **Backwards-compatible English output:** the English card aria-label must remain byte-identical to today's (`"2 striped red diamonds"` / `"1 striped red diamond"`) so existing tests stay green.
- **The `useT()` context has an English default value**, so components render in English without a provider — existing tests need no provider wrapper unless noted.
- **Deployment:** work stays on branch `feature/tutorial-and-i18n`. Pushing `main` ships to Render prod, so `npm run typecheck`, `npm test`, and `npm run build` must all pass before any merge.
- **Commands:** test a single file with `npx vitest run <path>`; full suite `npm test`; types `npm run typecheck`.

---

## File Structure

**New files**
- `src/i18n/detectLang.ts` — pure locale→`Lang` detection.
- `src/i18n/langStorage.ts` — localStorage get/set for language.
- `src/i18n/strings.ts` — `Lang`, `StringKey`, and the `{ en, zh }` dictionary.
- `src/i18n/LanguageContext.tsx` — `LanguageProvider`, `useT()`, interpolation.
- `src/i18n/cardAria.ts` — locale-aware `cardAriaLabel(card, lang)`.
- `src/components/CardFace.tsx` — presentational shape SVGs, extracted from `Card.tsx`.
- `src/components/LanguageToggle.tsx` — `EN | 中` segmented control.
- `src/components/HowToPlay.tsx` — tutorial overlay + exported example triples.
- `src/test/renderWithI18n.tsx` — test helper wrapping UI in `LanguageProvider`.
- Test files alongside each of the above where noted.

**Modified files**
- `src/components/Card.tsx` — use `CardFace`; localize aria-label; keep `ariaLabel` export.
- `src/state/useGame.ts` — `paused` state + `pause()`/`resume()`; single running-control effect.
- `src/components/Hud.tsx`, `Timer.tsx`, `WinModal.tsx` — strings via `t()`.
- `src/components/StartScreen.tsx` — strings + How-to button + `LanguageToggle`.
- `src/components/Screens.test.tsx` — pass new `onHowToPlay` prop.
- `src/App.tsx` — provider-less English default OK; feedback strings; topbar actions; tutorial state + pause wiring; render overlay.
- `src/main.tsx` — wrap `<App />` in `<LanguageProvider>`.
- `src/index.css` — new styles.

---

## Task 1: i18n primitives — detect + storage

**Files:**
- Create: `src/i18n/detectLang.ts`, `src/i18n/langStorage.ts`
- Test: `src/i18n/detectLang.test.ts`, `src/i18n/langStorage.test.ts`

**Interfaces:**
- Produces: `type Lang = 'en' | 'zh'` (canonical home is `detectLang.ts`; every other module imports it from there); `detectLang(navigatorLanguage: string | undefined): Lang`; `getStoredLang(): Lang | null`; `setStoredLang(lang: Lang): void`.

> Import direction (avoids any cycle): `detectLang.ts` defines `Lang` and imports nothing local. `langStorage.ts`, `strings.ts`, `cardAria.ts`, and `LanguageContext.tsx` all `import type { Lang } from './detectLang'`.

- [ ] **Step 1: Write the failing tests**

`src/i18n/detectLang.test.ts`:
```tsx
import { detectLang } from './detectLang';

it('detects Chinese from any zh locale', () => {
  expect(detectLang('zh')).toBe('zh');
  expect(detectLang('zh-CN')).toBe('zh');
  expect(detectLang('ZH-TW')).toBe('zh');
});

it('falls back to English otherwise', () => {
  expect(detectLang('en-US')).toBe('en');
  expect(detectLang('')).toBe('en');
  expect(detectLang(undefined)).toBe('en');
});
```

`src/i18n/langStorage.test.ts`:
```tsx
import { getStoredLang, setStoredLang } from './langStorage';

beforeEach(() => localStorage.clear());

it('returns null when nothing stored', () => {
  expect(getStoredLang()).toBeNull();
});

it('round-trips a valid language', () => {
  setStoredLang('zh');
  expect(getStoredLang()).toBe('zh');
});

it('ignores a corrupt stored value', () => {
  localStorage.setItem('set-game:lang', 'fr');
  expect(getStoredLang()).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/i18n/detectLang.test.ts src/i18n/langStorage.test.ts`
Expected: FAIL — cannot find module `./detectLang` / `./langStorage`.

- [ ] **Step 3: Implement**

`src/i18n/detectLang.ts`:
```ts
export type Lang = 'en' | 'zh';

export function detectLang(navigatorLanguage: string | undefined): Lang {
  return navigatorLanguage?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}
```

`src/i18n/langStorage.ts`:
```ts
import type { Lang } from './detectLang';

const KEY = 'set-game:lang';

export function getStoredLang(): Lang | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === 'en' || raw === 'zh' ? raw : null;
  } catch {
    return null;
  }
}

export function setStoredLang(lang: Lang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* storage unavailable — ignore */
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/i18n/detectLang.test.ts src/i18n/langStorage.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/detectLang.ts src/i18n/langStorage.ts src/i18n/detectLang.test.ts src/i18n/langStorage.test.ts
git commit -m "feat(i18n): locale detection and language persistence"
```

---

## Task 2: String dictionary

**Files:**
- Create: `src/i18n/strings.ts`
- Test: `src/i18n/strings.test.ts`

**Interfaces:**
- Consumes: `Lang` from `./detectLang`.
- Produces: `type StringKey`; `const strings: Record<Lang, Record<StringKey, string>>`. The `zh` object is typed `Record<StringKey, string>`, so the compiler forces every key to be translated.

- [ ] **Step 1: Write the failing test**

`src/i18n/strings.test.ts`:
```tsx
import { strings } from './strings';

it('en and zh expose the identical set of keys', () => {
  const en = Object.keys(strings.en).sort();
  const zh = Object.keys(strings.zh).sort();
  expect(zh).toEqual(en);
});

it('has no empty string values', () => {
  for (const lang of ['en', 'zh'] as const) {
    for (const [k, v] of Object.entries(strings[lang])) {
      expect(v, `${lang}.${k}`).not.toBe('');
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/i18n/strings.test.ts`
Expected: FAIL — cannot find module `./strings`.

- [ ] **Step 3: Implement**

`src/i18n/strings.ts`:
```ts
import type { Lang } from './detectLang';

const en = {
  'start.tagline': 'Clear the deck. Beat the clock.',
  'start.rule1': 'Find 3 cards where each feature is all-same or all-different.',
  'start.rule2': 'Wrong pick: +5s. Hint: +15s.',
  'start.rule3': 'Empty the whole deck as fast as you can.',
  'start.best': 'Best time {time}',
  'start.startBtn': 'Start',
  'start.howToPlayBtn': 'How to Play',

  'howto.title': 'How to Play',
  'howto.intro':
    'A Set is 3 cards where, for each of the four features, the values are either all the same or all different.',
  'howto.featuresTitle': 'The four features',
  'howto.feature.count': 'Count',
  'howto.feature.color': 'Color',
  'howto.feature.shape': 'Shape',
  'howto.feature.shading': 'Shading',
  'howto.validTitle': 'This is a Set ✓',
  'howto.validWhy':
    'Every feature is all-different — counts 1·2·3, three colors, three shapes, three shadings.',
  'howto.invalidTitle': 'Not a Set ✗',
  'howto.invalidAWhy':
    'Colors are red, red, purple — two the same and one different. Each feature must be all-same or all-different.',
  'howto.invalidBWhy':
    'Shadings are solid, solid, striped — neither all-same nor all-different.',
  'howto.close': 'Got it',
  'howto.closeAria': 'Close',

  'hud.deck': 'Deck',
  'hud.mistakes': 'Mistakes',
  'hud.hint': 'Hint (+15s)',

  'topbar.howToAria': 'How to play',
  'lang.groupAria': 'Language',

  'timer.aria': 'elapsed time',

  'win.eyebrow': 'Deck cleared',
  'win.title': 'Nice run!',
  'win.record': 'New record! 🎉',
  'win.best': 'Best time {time}',
  'win.playAgain': 'Play Again',
  'win.dialogLabel': 'You won',

  'feedback.won': 'Deck cleared! Final time {time}.',
  'feedback.setFound': 'Set found!',
  'feedback.notSet': 'Not a Set. Five second penalty.',
  'feedback.hint': 'Hint shown.',

  'color.red': 'red',
  'color.green': 'green',
  'color.purple': 'purple',
  'shape.diamond': 'diamond',
  'shape.squiggle': 'squiggle',
  'shape.oval': 'oval',
  'shading.solid': 'solid',
  'shading.striped': 'striped',
  'shading.open': 'open',
} as const;

export type StringKey = keyof typeof en;

const zh: Record<StringKey, string> = {
  'start.tagline': '清空牌堆，挑战最快速度。',
  'start.rule1': '找出 3 张卡片，使每种特征都完全相同或完全不同。',
  'start.rule2': '选错：+5秒。提示：+15秒。',
  'start.rule3': '尽快清空整个牌堆。',
  'start.best': '最佳时间 {time}',
  'start.startBtn': '开始',
  'start.howToPlayBtn': '玩法说明',

  'howto.title': '玩法说明',
  'howto.intro':
    '一组「Set」由 3 张卡片组成：四种特征中的每一种，都必须完全相同或完全不同。',
  'howto.featuresTitle': '四种特征',
  'howto.feature.count': '数量',
  'howto.feature.color': '颜色',
  'howto.feature.shape': '形状',
  'howto.feature.shading': '填充',
  'howto.validTitle': '这是一组 Set ✓',
  'howto.validWhy':
    '每种特征都完全不同——数量 1·2·3、三种颜色、三种形状、三种填充。',
  'howto.invalidTitle': '不是一组 Set ✗',
  'howto.invalidAWhy':
    '颜色是红、红、紫——两张相同、一张不同。每种特征都必须完全相同或完全不同。',
  'howto.invalidBWhy':
    '填充是实心、实心、条纹——既不完全相同也不完全不同。',
  'howto.close': '明白了',
  'howto.closeAria': '关闭',

  'hud.deck': '牌堆',
  'hud.mistakes': '错误',
  'hud.hint': '提示 (+15秒)',

  'topbar.howToAria': '玩法说明',
  'lang.groupAria': '语言',

  'timer.aria': '已用时间',

  'win.eyebrow': '牌堆已清空',
  'win.title': '干得漂亮！',
  'win.record': '新纪录！🎉',
  'win.best': '最佳时间 {time}',
  'win.playAgain': '再玩一次',
  'win.dialogLabel': '你赢了',

  'feedback.won': '牌堆已清空！最终用时 {time}。',
  'feedback.setFound': '找到一组 Set！',
  'feedback.notSet': '不是一组 Set，加罚五秒。',
  'feedback.hint': '已显示提示。',

  'color.red': '红色',
  'color.green': '绿色',
  'color.purple': '紫色',
  'shape.diamond': '菱形',
  'shape.squiggle': '波浪形',
  'shape.oval': '椭圆形',
  'shading.solid': '实心',
  'shading.striped': '条纹',
  'shading.open': '空心',
};

export const strings: Record<Lang, Record<StringKey, string>> = { en, zh };
```

- [ ] **Step 4: Run test + typecheck to verify pass**

Run: `npx vitest run src/i18n/strings.test.ts && npm run typecheck`
Expected: PASS (2 tests); typecheck clean (the `zh: Record<StringKey, string>` annotation guarantees key parity at compile time).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/strings.ts src/i18n/strings.test.ts
git commit -m "feat(i18n): en/zh string dictionary with typed keys"
```

---

## Task 3: Language context + provider + test helper

**Files:**
- Create: `src/i18n/LanguageContext.tsx`, `src/test/renderWithI18n.tsx`
- Test: `src/i18n/LanguageContext.test.tsx`

**Interfaces:**
- Consumes: `strings`, `StringKey` from `./strings`; `Lang` from `./detectLang`; `detectLang`; `getStoredLang`, `setStoredLang`.
- Produces:
  - `interface I18n { lang: Lang; setLang: (lang: Lang) => void; t: (key: StringKey, params?: Record<string, string | number>) => string; }`
  - `function LanguageProvider({ children }: { children: ReactNode }): JSX.Element`
  - `function useT(): I18n` — returns an English-default value when no provider is mounted.
  - `renderWithI18n(ui, options?)` from the test helper.

- [ ] **Step 1: Write the failing test**

`src/i18n/LanguageContext.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider, useT } from './LanguageContext';

function Probe() {
  const { t, lang, setLang } = useT();
  return (
    <div>
      <span data-testid="deck">{t('hud.deck')}</span>
      <span data-testid="best">{t('win.best', { time: '01:23.4' })}</span>
      <span data-testid="lang">{lang}</span>
      <button onClick={() => setLang('zh')}>to-zh</button>
    </div>
  );
}

beforeEach(() => localStorage.clear());

it('defaults to English, interpolates params', () => {
  render(<LanguageProvider><Probe /></LanguageProvider>);
  expect(screen.getByTestId('deck').textContent).toBe('Deck');
  expect(screen.getByTestId('best').textContent).toBe('Best time 01:23.4');
});

it('switches language and persists the choice', async () => {
  render(<LanguageProvider><Probe /></LanguageProvider>);
  await userEvent.click(screen.getByText('to-zh'));
  expect(screen.getByTestId('deck').textContent).toBe('牌堆');
  expect(localStorage.getItem('set-game:lang')).toBe('zh');
});

it('uses the stored language on mount', () => {
  localStorage.setItem('set-game:lang', 'zh');
  render(<LanguageProvider><Probe /></LanguageProvider>);
  expect(screen.getByTestId('lang').textContent).toBe('zh');
});

it('falls back to an English default with no provider', () => {
  render(<Probe />);
  expect(screen.getByTestId('deck').textContent).toBe('Deck');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/i18n/LanguageContext.test.tsx`
Expected: FAIL — cannot find module `./LanguageContext`.

- [ ] **Step 3: Implement**

`src/i18n/LanguageContext.tsx`:
```tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { strings, type StringKey } from './strings';
import { detectLang, type Lang } from './detectLang';
import { getStoredLang, setStoredLang } from './langStorage';

export interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey, params?: Record<string, string | number>) => string;
}

function translate(lang: Lang, key: StringKey, params?: Record<string, string | number>): string {
  const template = strings[lang][key] ?? strings.en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`
  );
}

function initialLang(): Lang {
  const stored = getStoredLang();
  if (stored) return stored;
  return detectLang(typeof navigator !== 'undefined' ? navigator.language : undefined);
}

const defaultValue: I18n = {
  lang: 'en',
  setLang: () => {},
  t: (key, params) => translate('en', key, params),
};

const LanguageContext = createContext<I18n>(defaultValue);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    setStoredLang(next);
  }, []);
  const value = useMemo<I18n>(
    () => ({ lang, setLang, t: (key, params) => translate(lang, key, params) }),
    [lang, setLang]
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useT(): I18n {
  return useContext(LanguageContext);
}
```

`src/test/renderWithI18n.tsx`:
```tsx
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { LanguageProvider } from '../i18n/LanguageContext';

export function renderWithI18n(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => <LanguageProvider>{children}</LanguageProvider>,
    ...options,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/i18n/LanguageContext.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/LanguageContext.tsx src/i18n/LanguageContext.test.tsx src/test/renderWithI18n.tsx
git commit -m "feat(i18n): language provider, useT hook, test helper"
```

---

## Task 4: Locale-aware card aria-label

**Files:**
- Create: `src/i18n/cardAria.ts`
- Test: `src/i18n/cardAria.test.ts`

**Interfaces:**
- Consumes: `strings` from `./strings`; `Lang` from `./detectLang`; `Card` type from `../game/cards`.
- Produces: `cardAriaLabel(card: Card, lang: Lang): string`. English output is byte-identical to the legacy `ariaLabel` (`"2 striped red diamonds"`).

- [ ] **Step 1: Write the failing test**

`src/i18n/cardAria.test.ts`:
```ts
import { cardAriaLabel } from './cardAria';
import type { Card } from '../game/cards';

const c: Card = { id: '2-diamond-striped-red', count: 2, shape: 'diamond', shading: 'striped', color: 'red' };

it('builds English plural/singular labels identical to the legacy format', () => {
  expect(cardAriaLabel(c, 'en')).toBe('2 striped red diamonds');
  expect(cardAriaLabel({ ...c, count: 1 }, 'en')).toBe('1 striped red diamond');
});

it('builds Chinese labels with a measure word and no plural', () => {
  expect(cardAriaLabel(c, 'zh')).toBe('2个红色条纹菱形');
  expect(cardAriaLabel({ ...c, count: 1 }, 'zh')).toBe('1个红色条纹菱形');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/i18n/cardAria.test.ts`
Expected: FAIL — cannot find module `./cardAria`.

- [ ] **Step 3: Implement**

`src/i18n/cardAria.ts`:
```ts
import { strings } from './strings';
import type { Lang } from './detectLang';
import type { Card } from '../game/cards';

export function cardAriaLabel(card: Card, lang: Lang): string {
  const s = strings[lang];
  const color = s[`color.${card.color}`];
  const shading = s[`shading.${card.shading}`];
  const shape = s[`shape.${card.shape}`];
  if (lang === 'zh') {
    return `${card.count}个${color}${shading}${shape}`;
  }
  const noun = shape + (card.count > 1 ? 's' : '');
  return `${card.count} ${shading} ${color} ${noun}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/i18n/cardAria.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/cardAria.ts src/i18n/cardAria.test.ts
git commit -m "feat(i18n): locale-aware card aria-label builder"
```

---

## Task 5: Extract CardFace + localize Card

**Files:**
- Create: `src/components/CardFace.tsx`
- Modify: `src/components/Card.tsx`
- Test: `src/components/Card.test.tsx` (existing — must stay green, no edits expected)

**Interfaces:**
- Consumes: `cardAriaLabel` (Task 4); `useT` (Task 3); `COLOR_HEX` from `./SetSvgDefs`.
- Produces: `CardFace({ card }: { card: CardModel })` rendering `card.count` `<svg class="shape">` elements; `Card` unchanged public props; `ariaLabel(card: CardModel): string` still exported (English).

- [ ] **Step 1: Confirm the existing Card tests are the guard**

No new test. `src/components/Card.test.tsx` already asserts the rendered label `"2 striped red diamonds"`, two `svg.shape` nodes, `aria-pressed`, `onSelect`, and `ariaLabel({...,count:1}) === '1 striped red diamond'`. These are the acceptance criteria.

- [ ] **Step 2: Run the existing test to confirm current green baseline**

Run: `npx vitest run src/components/Card.test.tsx`
Expected: PASS (3 tests) against current code.

- [ ] **Step 3: Create `src/components/CardFace.tsx`**

Move `SHAPE_PATH` and the `ShapeSvg` helper **verbatim** out of the current `Card.tsx` (its lines 7–38, including the long squiggle path string) into this file, and add the `CardFace` wrapper:

```tsx
import type { Card as CardModel, Color, Shape, Shading } from '../game/cards';
import { COLOR_HEX } from './SetSvgDefs';

// Shapes drawn in a portrait 50x100 viewBox, laid out in a row on the card.
// (SHAPE_PATH moved verbatim from Card.tsx — do not retype the squiggle path.)
const SHAPE_PATH: Record<Exclude<Shape, 'oval'>, string> = {
  diamond: 'M25 4 L47 50 L25 96 L3 50 Z',
  squiggle: '<<< paste the exact squiggle path string from Card.tsx line 10 >>>',
};

function ShapeSvg({ shape, shading, color }: { shape: Shape; shading: Shading; color: Color }) {
  const stroke = COLOR_HEX[color];
  const fill =
    shading === 'solid' ? stroke : shading === 'striped' ? `url(#stripes-${color})` : 'none';
  return (
    <svg className="shape" viewBox="0 0 50 100" aria-hidden="true">
      {shape === 'oval' ? (
        <rect x="6" y="6" width="38" height="88" rx="19" fill={fill} stroke={stroke} strokeWidth="4" />
      ) : (
        <path
          d={SHAPE_PATH[shape]}
          fill={fill}
          stroke={stroke}
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function CardFace({ card }: { card: CardModel }) {
  return (
    <>
      {Array.from({ length: card.count }).map((_, i) => (
        <ShapeSvg key={i} shape={card.shape} shading={card.shading} color={card.color} />
      ))}
    </>
  );
}
```

- [ ] **Step 4: Rewrite `src/components/Card.tsx` to use CardFace + localized label**

```tsx
import type { Card as CardModel } from '../game/cards';
import { CardFace } from './CardFace';
import { cardAriaLabel } from '../i18n/cardAria';
import { useT } from '../i18n/LanguageContext';

// Kept for tests and callers that want the English label without a locale.
export function ariaLabel(c: CardModel): string {
  return cardAriaLabel(c, 'en');
}

interface CardProps {
  card: CardModel;
  selected: boolean;
  hinted: boolean;
  feedback: 'correct' | 'wrong' | null;
  onSelect: (id: string) => void;
}

export function Card({ card, selected, hinted, feedback, onSelect }: CardProps) {
  const { lang } = useT();
  const classes = [
    'card',
    `color-${card.color}`,
    selected ? 'selected' : '',
    hinted ? 'hinted' : '',
    feedback ? feedback : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      aria-label={cardAriaLabel(card, lang)}
      aria-pressed={selected}
      onClick={() => onSelect(card.id)}
    >
      <CardFace card={card} />
    </button>
  );
}
```

- [ ] **Step 5: Run Card + Board tests to verify green**

Run: `npx vitest run src/components/Card.test.tsx src/components/Board.test.tsx`
Expected: PASS. (Card rendered without a provider → `useT` English default → label unchanged; two `svg.shape` nodes preserved by `CardFace`.)

- [ ] **Step 6: Commit**

```bash
git add src/components/CardFace.tsx src/components/Card.tsx
git commit -m "refactor(card): extract CardFace and localize aria-label"
```

---

## Task 6: LanguageToggle component

**Files:**
- Create: `src/components/LanguageToggle.tsx`
- Test: `src/components/LanguageToggle.test.tsx`

**Interfaces:**
- Consumes: `useT` (Task 3); `Lang` from `../i18n/detectLang`; `renderWithI18n` (Task 3).
- Produces: `LanguageToggle()` — a `role="group"` with two buttons labelled `EN` and `中`, each with `aria-pressed` marking the active language.

- [ ] **Step 1: Write the failing test**

`src/components/LanguageToggle.test.tsx`:
```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '../test/renderWithI18n';
import { LanguageToggle } from './LanguageToggle';
import { useT } from '../i18n/LanguageContext';

function Probe() {
  const { t } = useT();
  return <span data-testid="probe">{t('hud.deck')}</span>;
}

beforeEach(() => localStorage.clear());

it('marks EN active by default and switches to Chinese on click', async () => {
  renderWithI18n(<><LanguageToggle /><Probe /></>);
  expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('probe').textContent).toBe('Deck');

  await userEvent.click(screen.getByRole('button', { name: '中' }));

  expect(screen.getByRole('button', { name: '中' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('probe').textContent).toBe('牌堆');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/LanguageToggle.test.tsx`
Expected: FAIL — cannot find module `./LanguageToggle`.

- [ ] **Step 3: Implement**

`src/components/LanguageToggle.tsx`:
```tsx
import { useT } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/detectLang';

const LABELS: Record<Lang, string> = { en: 'EN', zh: '中' };
const ORDER: Lang[] = ['en', 'zh'];

export function LanguageToggle() {
  const { lang, setLang, t } = useT();
  return (
    <div className="lang-toggle" role="group" aria-label={t('lang.groupAria')}>
      {ORDER.map((l) => (
        <button
          key={l}
          type="button"
          className={l === lang ? 'lang-opt active' : 'lang-opt'}
          aria-pressed={l === lang}
          onClick={() => setLang(l)}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/LanguageToggle.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/LanguageToggle.tsx src/components/LanguageToggle.test.tsx
git commit -m "feat(i18n): EN/中 language toggle control"
```

---

## Task 7: Pause the clock — single source of truth in useGame

**Files:**
- Modify: `src/state/useGame.ts`
- Test: `src/state/useGame.pause.test.tsx` (new file, alongside existing `useGame.test.tsx`)

**Interfaces:**
- Consumes: existing `pauseTimer`, `resumeTimer` from `./timer`.
- Produces: `UseGame` gains `paused: boolean`, `pause: () => void`, `resume: () => void`. The clock runs iff `screen === 'playing' && !paused && !hidden`.

- [ ] **Step 1: Write the failing test**

`src/state/useGame.pause.test.tsx`:
```tsx
import { renderHook, act } from '@testing-library/react';
import { useGame } from './useGame';
import * as timer from './timer';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('exposes paused state that pause/resume toggle, reset by start', () => {
  const { result } = renderHook(() => useGame(1));
  expect(result.current.paused).toBe(false);

  act(() => { result.current.pause(); });
  expect(result.current.paused).toBe(true);

  act(() => { result.current.resume(); });
  expect(result.current.paused).toBe(false);

  act(() => { result.current.pause(); });
  act(() => { result.current.start(); });
  expect(result.current.paused).toBe(false);
});

it('pauses and resumes the running clock while playing', () => {
  const pauseSpy = vi.spyOn(timer, 'pauseTimer');
  const resumeSpy = vi.spyOn(timer, 'resumeTimer');
  const { result } = renderHook(() => useGame(1));

  act(() => { result.current.start(); });
  pauseSpy.mockClear();
  resumeSpy.mockClear();

  act(() => { result.current.pause(); });
  expect(pauseSpy).toHaveBeenCalled();

  act(() => { result.current.resume(); });
  expect(resumeSpy).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/useGame.pause.test.tsx`
Expected: FAIL — `result.current.paused` is `undefined` / `pause` is not a function.

- [ ] **Step 3: Implement — edit `src/state/useGame.ts`**

3a. Add to the `UseGame` interface (after `hint: () => void;`):
```ts
  paused: boolean;
  pause: () => void;
  resume: () => void;
```

3b. Add state near the other `useState` calls (after `const [displayMs, setDisplayMs] = useState(0);`):
```ts
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
```

3c. **Replace** the existing "Pause the clock when the tab is hidden" effect (currently lines ~52–61) with these two effects:
```ts
  // Track tab visibility as state (a single source of truth drives the clock).
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // The clock runs only while playing, not paused (tutorial), and not hidden.
  useEffect(() => {
    if (screen !== 'playing') return;
    const now = performance.now();
    timerRef.current =
      paused || hidden ? pauseTimer(timerRef.current, now) : resumeTimer(timerRef.current, now);
  }, [screen, paused, hidden]);
```

3d. In `start` (the `useCallback`), add `setPaused(false);` alongside the other resets (e.g. after `setIsRecord(false);`).

3e. Add the callbacks near `select`/`hint`:
```ts
  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);
```

3f. Extend the returned object:
```ts
  return { screen, state, displayMs, bestMs, isRecord, start, select, hint, paused, pause, resume };
```

- [ ] **Step 4: Run pause test + existing useGame test to verify pass**

Run: `npx vitest run src/state/useGame.pause.test.tsx src/state/useGame.test.tsx`
Expected: PASS (existing win-flow test still passes; the tab-visibility behaviour is preserved via the new state-driven effect).

- [ ] **Step 5: Commit**

```bash
git add src/state/useGame.ts src/state/useGame.pause.test.tsx
git commit -m "feat(game): pause/resume clock via single source of truth"
```

---

## Task 8: Localize Hud, Timer, WinModal

**Files:**
- Modify: `src/components/Hud.tsx`, `src/components/Timer.tsx`, `src/components/WinModal.tsx`
- Test: existing `src/components/Hud.test.tsx`, `src/components/Screens.test.tsx` (must stay green)

**Interfaces:**
- Consumes: `useT` (Task 3). All three render English by default (no provider in their tests).

- [ ] **Step 1: Confirm baseline green**

Run: `npx vitest run src/components/Hud.test.tsx src/components/Screens.test.tsx`
Expected: PASS against current code.

- [ ] **Step 2: Edit `src/components/Hud.tsx`**

```tsx
import { useT } from '../i18n/LanguageContext';

interface HudProps {
  deckCount: number;
  mistakes: number;
  onHint: () => void;
  hintDisabled: boolean;
}

export function Hud({ deckCount, mistakes, onHint, hintDisabled }: HudProps) {
  const { t } = useT();
  return (
    <div className="hud">
      <span className="hud-item">{t('hud.deck')} <strong>{deckCount}</strong></span>
      <span className="hud-item">{t('hud.mistakes')} <strong>{mistakes}</strong></span>
      <button type="button" className="hint-btn" onClick={onHint} disabled={hintDisabled}>
        {t('hud.hint')}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Edit `src/components/Timer.tsx`**

```tsx
import { formatTime } from '../lib/format';
import { useT } from '../i18n/LanguageContext';

export function Timer({ ms }: { ms: number }) {
  const { t } = useT();
  return (
    <div className="timer" role="timer" aria-label={t('timer.aria')}>
      {formatTime(ms)}
    </div>
  );
}
```

- [ ] **Step 4: Edit `src/components/WinModal.tsx`**

Replace the literal strings with `t()` (keep all existing structure, refs, and `formatTime`):
```tsx
import { useEffect, useRef } from 'react';
import { formatTime } from '../lib/format';
import { useT } from '../i18n/LanguageContext';

interface WinModalProps {
  timeMs: number;
  bestMs: number;
  isRecord: boolean;
  onPlayAgain: () => void;
}

export function WinModal({ timeMs, bestMs, isRecord, onPlayAgain }: WinModalProps) {
  const { t } = useT();
  const playAgainRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    playAgainRef.current?.focus();
  }, []);

  return (
    <div className="modal-backdrop">
      <div className="screen win-modal" role="dialog" aria-modal="true" aria-label={t('win.dialogLabel')}>
        <p className="win-eyebrow">{t('win.eyebrow')}</p>
        <h2>{t('win.title')}</h2>
        <p className="final-time">{formatTime(timeMs)}</p>
        {isRecord && <p className="record-badge">{t('win.record')}</p>}
        <p className="best">{t('win.best', { time: formatTime(bestMs) })}</p>
        <button type="button" className="primary-btn" onClick={onPlayAgain} ref={playAgainRef}>
          {t('win.playAgain')}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify still green**

Run: `npx vitest run src/components/Hud.test.tsx src/components/Screens.test.tsx`
Expected: PASS. English defaults keep `Deck`/`Mistakes`/`Hint (+15s)`, `Best time …`, `New record! 🎉`, `Play Again` matching the existing regex assertions.

- [ ] **Step 6: Commit**

```bash
git add src/components/Hud.tsx src/components/Timer.tsx src/components/WinModal.tsx
git commit -m "feat(i18n): localize HUD, timer, and win modal"
```

---

## Task 9: Localize StartScreen + How-to button + toggle

**Files:**
- Modify: `src/components/StartScreen.tsx`, `src/components/Screens.test.tsx`

**Interfaces:**
- Consumes: `useT` (Task 3); `LanguageToggle` (Task 6); `formatTime`.
- Produces: `StartScreen` gains a required prop `onHowToPlay: () => void`, renders a "How to Play" button and the `LanguageToggle`.

- [ ] **Step 1: Update the existing test first (it will fail to compile until StartScreen changes)**

Edit `src/components/Screens.test.tsx` — the two `StartScreen` renders must pass `onHowToPlay`, and switch to `renderWithI18n` for consistency. Also add a How-to assertion:

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '../test/renderWithI18n';
import { StartScreen } from './StartScreen';
import { WinModal } from './WinModal';

it('start screen starts the game, shows best time, and opens how-to', async () => {
  const onStart = vi.fn();
  const onHowToPlay = vi.fn();
  renderWithI18n(<StartScreen bestMs={65400} onStart={onStart} onHowToPlay={onHowToPlay} />);
  expect(screen.getByText(/1:05\.4/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /start/i }));
  expect(onStart).toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: /how to play/i }));
  expect(onHowToPlay).toHaveBeenCalled();
});

it('start screen omits best time when null', () => {
  renderWithI18n(<StartScreen bestMs={null} onStart={() => {}} onHowToPlay={() => {}} />);
  expect(screen.queryByText(/best time/i)).not.toBeInTheDocument();
});

it('win modal shows the final time, a record badge, and replays', async () => {
  const onPlayAgain = vi.fn();
  renderWithI18n(<WinModal timeMs={90000} bestMs={90000} isRecord={true} onPlayAgain={onPlayAgain} />);
  expect(screen.getByText('1:30.0')).toBeInTheDocument();
  expect(screen.getByText(/new record/i)).toBeInTheDocument();
  expect(screen.getByText(/best time/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /play again/i }));
  expect(onPlayAgain).toHaveBeenCalled();
});

it('win modal hides the record badge when not a record', () => {
  renderWithI18n(<WinModal timeMs={90000} bestMs={80000} isRecord={false} onPlayAgain={() => {}} />);
  expect(screen.queryByText(/new record/i)).not.toBeInTheDocument();
});
```

> Note: the null-best assertion changed from `/best/i` to `/best time/i` — the "How to Play" button does not contain "best time", so the check stays valid and unambiguous.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Screens.test.tsx`
Expected: FAIL — `StartScreen` has no `onHowToPlay` prop / no "How to Play" button yet.

- [ ] **Step 3: Implement `src/components/StartScreen.tsx`**

```tsx
import { formatTime } from '../lib/format';
import { useT } from '../i18n/LanguageContext';
import { LanguageToggle } from './LanguageToggle';

interface StartScreenProps {
  bestMs: number | null;
  onStart: () => void;
  onHowToPlay: () => void;
}

export function StartScreen({ bestMs, onStart, onHowToPlay }: StartScreenProps) {
  const { t } = useT();
  return (
    <div className="screen start-screen">
      <div className="start-topline">
        <LanguageToggle />
      </div>
      <div className="brand">
        <div className="brand-glyphs" aria-hidden="true">
          <span className="glyph glyph-solid" />
          <span className="glyph glyph-striped" />
          <span className="glyph glyph-open" />
        </div>
        <h1>Set</h1>
      </div>
      <p className="tagline">{t('start.tagline')}</p>
      <ul className="how-to">
        <li>{t('start.rule1')}</li>
        <li>{t('start.rule2')}</li>
        <li>{t('start.rule3')}</li>
      </ul>
      {bestMs !== null && <p className="best">{t('start.best', { time: formatTime(bestMs) })}</p>}
      <button type="button" className="primary-btn" onClick={onStart}>
        {t('start.startBtn')}
      </button>
      <button type="button" className="text-btn" onClick={onHowToPlay}>
        {t('start.howToPlayBtn')}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Screens.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/StartScreen.tsx src/components/Screens.test.tsx
git commit -m "feat(i18n): localize start screen, add how-to button and toggle"
```

---

## Task 10: How-to-Play tutorial overlay

**Files:**
- Create: `src/components/HowToPlay.tsx`
- Test: `src/components/HowToPlay.test.tsx`

**Interfaces:**
- Consumes: `useT` (Task 3); `CardFace` (Task 5); `SetSvgDefs`; `cardId`, `Card` from `../game/cards`; `isSet` from `../game/set` (test only).
- Produces: `HowToPlay({ onClose }: { onClose: () => void })`; exported `EXAMPLE_VALID`, `EXAMPLE_INVALID_A`, `EXAMPLE_INVALID_B: [Card, Card, Card]`.

- [ ] **Step 1: Write the failing test**

`src/components/HowToPlay.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  HowToPlay,
  EXAMPLE_VALID,
  EXAMPLE_INVALID_A,
  EXAMPLE_INVALID_B,
} from './HowToPlay';
import { isSet } from '../game/set';

it('examples agree with the real Set rule', () => {
  expect(isSet(...EXAMPLE_VALID)).toBe(true);
  expect(isSet(...EXAMPLE_INVALID_A)).toBe(false);
  expect(isSet(...EXAMPLE_INVALID_B)).toBe(false);
});

it('renders the dialog and closes via the close button', async () => {
  const onClose = vi.fn();
  render(<HowToPlay onClose={onClose} />);
  expect(screen.getByRole('dialog', { name: /how to play/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /close/i }));
  expect(onClose).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/HowToPlay.test.tsx`
Expected: FAIL — cannot find module `./HowToPlay`.

- [ ] **Step 3: Implement `src/components/HowToPlay.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { useT } from '../i18n/LanguageContext';
import { SetSvgDefs } from './SetSvgDefs';
import { CardFace } from './CardFace';
import { cardId, type Card } from '../game/cards';

function make(c: Omit<Card, 'id'>): Card {
  return { id: cardId(c), ...c };
}

// A Set: every feature is all-different.
export const EXAMPLE_VALID: [Card, Card, Card] = [
  make({ count: 1, shape: 'diamond', shading: 'solid', color: 'red' }),
  make({ count: 2, shape: 'squiggle', shading: 'striped', color: 'green' }),
  make({ count: 3, shape: 'oval', shading: 'open', color: 'purple' }),
];

// Not a Set: colours are red, red, purple (two-same-one-different).
export const EXAMPLE_INVALID_A: [Card, Card, Card] = [
  make({ count: 1, shape: 'diamond', shading: 'solid', color: 'red' }),
  make({ count: 2, shape: 'squiggle', shading: 'striped', color: 'red' }),
  make({ count: 3, shape: 'oval', shading: 'open', color: 'purple' }),
];

// Not a Set: shadings are solid, solid, striped.
export const EXAMPLE_INVALID_B: [Card, Card, Card] = [
  make({ count: 1, shape: 'diamond', shading: 'solid', color: 'red' }),
  make({ count: 2, shape: 'squiggle', shading: 'solid', color: 'green' }),
  make({ count: 3, shape: 'oval', shading: 'striped', color: 'purple' }),
];

function ExampleRow({ cards, title, why }: { cards: [Card, Card, Card]; title: string; why: string }) {
  return (
    <div className="howto-example">
      <p className="howto-example-title">{title}</p>
      <div className="howto-example-cards">
        {cards.map((c) => (
          <div key={c.id} className={`example-card color-${c.color}`}>
            <CardFace card={c} />
          </div>
        ))}
      </div>
      <p className="howto-example-why">{why}</p>
    </div>
  );
}

export function HowToPlay({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const values = (a: string, b: string, c: string) => `${a} · ${b} · ${c}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="screen how-to-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('howto.title')}
        onClick={(e) => e.stopPropagation()}
      >
        <SetSvgDefs />
        <button
          type="button"
          className="howto-close"
          aria-label={t('howto.closeAria')}
          onClick={onClose}
          ref={closeRef}
        >
          {'✕'}
        </button>
        <h2>{t('howto.title')}</h2>
        <p className="howto-intro">{t('howto.intro')}</p>

        <h3 className="howto-subtitle">{t('howto.featuresTitle')}</h3>
        <ul className="howto-features">
          <li><strong>{t('howto.feature.count')}</strong> — {values('1', '2', '3')}</li>
          <li><strong>{t('howto.feature.color')}</strong> — {values(t('color.red'), t('color.green'), t('color.purple'))}</li>
          <li><strong>{t('howto.feature.shape')}</strong> — {values(t('shape.diamond'), t('shape.squiggle'), t('shape.oval'))}</li>
          <li><strong>{t('howto.feature.shading')}</strong> — {values(t('shading.solid'), t('shading.striped'), t('shading.open'))}</li>
        </ul>

        <ExampleRow cards={EXAMPLE_VALID} title={t('howto.validTitle')} why={t('howto.validWhy')} />
        <ExampleRow cards={EXAMPLE_INVALID_A} title={t('howto.invalidTitle')} why={t('howto.invalidAWhy')} />
        <ExampleRow cards={EXAMPLE_INVALID_B} title={t('howto.invalidTitle')} why={t('howto.invalidBWhy')} />

        <button type="button" className="primary-btn" onClick={onClose}>
          {t('howto.close')}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/HowToPlay.test.tsx`
Expected: PASS (2 tests). The `dialog` name resolves from `aria-label="How to Play"`; the ✕ button matches `/close/i` via its `aria-label="Close"`.

- [ ] **Step 5: Commit**

```bash
git add src/components/HowToPlay.tsx src/components/HowToPlay.test.tsx
git commit -m "feat(tutorial): how-to-play overlay with verified example cards"
```

---

## Task 11: Wire App + provider in main

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`
- Test: existing `src/App.test.tsx` (must stay green)

**Interfaces:**
- Consumes: `useT`, `LanguageProvider` (Task 3); `LanguageToggle` (Task 6); `HowToPlay` (Task 10); `useGame` with `pause`/`resume` (Task 7).

- [ ] **Step 1: Confirm baseline green**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS against current code.

- [ ] **Step 2: Rewrite `src/App.tsx`**

```tsx
import { useCallback, useState } from 'react';
import { useGame } from './state/useGame';
import { StartScreen } from './components/StartScreen';
import { Board } from './components/Board';
import { Timer } from './components/Timer';
import { Hud } from './components/Hud';
import { WinModal } from './components/WinModal';
import { HowToPlay } from './components/HowToPlay';
import { LanguageToggle } from './components/LanguageToggle';
import { useT, type I18n } from './i18n/LanguageContext';
import { formatTime } from './lib/format';

function feedbackMessage(g: ReturnType<typeof useGame>, t: I18n['t']): string {
  if (g.screen === 'won') return t('feedback.won', { time: formatTime(g.displayMs) });
  if (g.state.pending) return g.state.pending.valid ? t('feedback.setFound') : t('feedback.notSet');
  if (g.state.hintedIds.length > 0) return t('feedback.hint');
  return '';
}

export default function App({ seed }: { seed?: number }) {
  const g = useGame(seed);
  const { t } = useT();
  const [howToOpen, setHowToOpen] = useState(false);
  const message = feedbackMessage(g, t);

  const openHowTo = useCallback(() => {
    g.pause();
    setHowToOpen(true);
  }, [g]);
  const closeHowTo = useCallback(() => {
    setHowToOpen(false);
    g.resume();
  }, [g]);

  return (
    <div className="app">
      <div className="sr-only" role="status" aria-live="polite">
        {message}
      </div>

      {g.screen === 'start' && (
        <StartScreen bestMs={g.bestMs} onStart={g.start} onHowToPlay={openHowTo} />
      )}

      {g.screen === 'playing' && (
        <div className="game">
          <header className="topbar">
            <Timer ms={g.displayMs} />
            <div className="topbar-actions">
              <button
                type="button"
                className="icon-btn"
                aria-label={t('topbar.howToAria')}
                onClick={openHowTo}
              >
                ?
              </button>
              <LanguageToggle />
            </div>
          </header>
          <Board state={g.state} onSelect={g.select} />
          <Hud
            deckCount={g.state.deck.length}
            mistakes={g.state.mistakes}
            onHint={g.hint}
            hintDisabled={g.state.pending !== null}
          />
        </div>
      )}

      {g.screen === 'won' && (
        <WinModal
          timeMs={g.displayMs}
          bestMs={g.bestMs ?? g.displayMs}
          isRecord={g.isRecord}
          onPlayAgain={g.start}
        />
      )}

      {howToOpen && <HowToPlay onClose={closeHowTo} />}
    </div>
  );
}
```

> Note: `openHowTo` calls `g.pause()` unconditionally. On the start screen this only sets the `paused` flag; the running-control effect early-returns because `screen !== 'playing'`, and `start()` resets `paused` to `false`. So it is a no-op for the clock until a game is in progress.

- [ ] **Step 3: Edit `src/main.tsx` to wrap the provider**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './i18n/LanguageContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
```

- [ ] **Step 4: Run App test + full suite to verify pass**

Run: `npx vitest run src/App.test.tsx && npm test`
Expected: PASS. App renders under the English default context (App.test mounts `<App />` without a provider), so `ariaLabel(card)` lookups and the "Start" button still match; the extra topbar/toggle buttons keep `getAllByRole('button').length >= board.length` true.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: wire language provider, tutorial overlay, and in-game controls"
```

---

## Task 12: Styling

**Files:**
- Modify: `src/index.css`

No unit test — verified by `npm run build` (bundles CSS) and `npm run typecheck`.

- [ ] **Step 1: Append styles to `src/index.css`**

Add at the end of the file:
```css
/* -------------------------------------------------------------------------
   i18n toggle, in-game top-bar actions
   ---------------------------------------------------------------------- */

.topbar {
  position: relative; /* actions pin to the right; timer stays centered */
}

.topbar-actions {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.start-topline {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

.icon-btn {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 999px;
  border: 1px solid var(--surface-border);
  background: var(--surface);
  color: var(--text-muted);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px var(--surface-shadow);
  transition: transform var(--dur-fast) var(--ease-out), color var(--dur-fast);
}
.icon-btn:hover {
  transform: translateY(-1px);
  color: var(--text);
}

.lang-toggle {
  display: inline-flex;
  border: 1px solid var(--surface-border);
  border-radius: 999px;
  background: var(--surface);
  overflow: hidden;
  box-shadow: 0 4px 12px var(--surface-shadow);
}
.lang-opt {
  border: none;
  background: transparent;
  color: var(--text-muted);
  padding: 0.35rem 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--dur-fast), color var(--dur-fast);
}
.lang-opt.active {
  background: var(--accent);
  color: #fff;
}

.text-btn {
  border: none;
  background: transparent;
  color: var(--accent);
  font-weight: 600;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
}
.text-btn:hover {
  text-decoration: underline;
}

/* -------------------------------------------------------------------------
   How-to-Play modal
   ---------------------------------------------------------------------- */

.how-to-modal {
  position: relative;
  max-width: 34rem;
  max-height: 90vh;
  overflow-y: auto;
  text-align: left;
  align-items: stretch;
  gap: 0.85rem;
}
.how-to-modal h2 {
  text-align: center;
}
.howto-close {
  position: absolute;
  top: 0.9rem;
  right: 1rem;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid var(--surface-border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
}
.howto-intro {
  margin: 0;
  color: var(--text);
  line-height: 1.6;
}
.howto-subtitle {
  margin: 0.5rem 0 0;
  font-family: var(--font-display);
  font-size: 1.1rem;
}
.howto-features {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--text-muted);
  line-height: 1.7;
}
.howto-features strong {
  color: var(--text);
}
.howto-example {
  border-top: 1px solid var(--surface-border);
  padding-top: 0.75rem;
}
.howto-example-title {
  margin: 0 0 0.5rem;
  font-weight: 700;
}
.howto-example-cards {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}
.example-card {
  flex: 1 1 0;
  max-width: 6rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.15rem;
  aspect-ratio: 3 / 2;
  padding: 0.4rem;
  background: linear-gradient(165deg, var(--card-bg), var(--card-bg-2));
  border-radius: var(--radius-sm);
  box-shadow: 0 2px 6px var(--card-shadow);
}
.howto-example-cards .shape {
  height: clamp(1.4rem, 5vw, 2rem);
}
.howto-example-why {
  margin: 0.5rem 0 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}
```

- [ ] **Step 2: Verify build + typecheck**

Run: `npm run typecheck && npm run build`
Expected: both succeed (typecheck clean; Vite build writes `dist/`).

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: how-to modal, language toggle, in-game top-bar actions"
```

---

## Task 13: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: all suites PASS, including the new i18n, toggle, tutorial, and pause tests and every pre-existing test.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: succeeds, emits `dist/`.

- [ ] **Step 4: Manual smoke (optional but recommended)**

Run: `npm run dev`, then in the browser: switch `EN`⇄`中` on the start screen and confirm all text flips; open **How to Play** and confirm the three example rows render real cards; start a game, open `?` mid-game and confirm the timer freezes, close and confirm it resumes.

- [ ] **Step 5: Final state**

All work is committed on `feature/tutorial-and-i18n`. Do **not** merge/push to `main` (auto-deploys to prod) until the human approves. Merge decision is handled via the `superpowers:finishing-a-development-branch` skill.

---

## Self-Review

**1. Spec coverage:**
- Simplified-Chinese whole-app i18n → Tasks 1–4, 8, 9, 11 (+ Card in 5). ✓
- Auto-detect + persist, key `set-game:lang` → Tasks 1, 3. ✓
- Language toggle on start + in-game → Tasks 6, 9, 11. ✓
- How-to-Play overlay with real example cards, verified valid/invalid → Task 10 (+ CardFace in 5). ✓
- Reachable from start + during play → Tasks 9, 11. ✓
- Timer pauses during in-game tutorial, single source of truth → Task 7 + wiring in 11. ✓
- Locale-aware card aria-labels → Tasks 4, 5. ✓
- Tests: key parity, detect/persist, tutorial-validity, toggle → Tasks 1, 2, 3, 6, 10. ✓
- Styling per existing conventions → Task 12. ✓
- Branch + verify-before-merge → Tasks 11-note, 13. ✓

**2. Placeholder scan:** The only intentional "paste" is the verbatim move of the long squiggle `SHAPE_PATH` string in Task 5 Step 3 (marked `<<< paste … >>>`) — it is an explicit move of existing code referenced by source line, not undefined new content. No TBD/TODO/"handle edge cases" remain.

**3. Type consistency:** `Lang` (in `detectLang.ts`), `StringKey`/`strings` (in `strings.ts`), `I18n`/`useT`/`LanguageProvider` (in `LanguageContext.tsx`), `cardAriaLabel(card, lang)`, `CardFace({card})`, `HowToPlay({onClose})`, and `useGame`'s added `paused`/`pause`/`resume` are used with the same names/signatures across Tasks 4, 5, 6, 9, 10, 11. `useT` is imported from `../i18n/LanguageContext` everywhere (the spec's separate `useT.ts` file is intentionally folded into `LanguageContext.tsx`). ✓
