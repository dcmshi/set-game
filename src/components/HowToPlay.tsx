import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/LanguageContext';
import { useModalFocus } from './useModalFocus';
import { CardFace } from './CardFace';
import { cardId, type Card } from '../game/cards';
import { isSet } from '../game/set';

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

// Six cards holding exactly one Set — a test in HowToPlay.test.tsx guards that
// invariant, so the practice row always has exactly one right answer.
export const PRACTICE_CARDS: Card[] = [
  make({ count: 3, shape: 'oval', shading: 'solid', color: 'green' }),
  make({ count: 1, shape: 'diamond', shading: 'solid', color: 'red' }),
  make({ count: 2, shape: 'squiggle', shading: 'striped', color: 'green' }),
  make({ count: 3, shape: 'oval', shading: 'open', color: 'purple' }),
  make({ count: 2, shape: 'oval', shading: 'solid', color: 'purple' }),
  make({ count: 2, shape: 'squiggle', shading: 'open', color: 'red' }),
];

// Clickable mini-puzzle: tap three cards, get judged against the real rule.
// A wrong trio clears itself after a beat; the right one stays highlighted.
function PracticeRow() {
  const { t } = useT();
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<'yes' | 'no' | null>(null);

  useEffect(() => {
    if (result !== 'no') return;
    const id = setTimeout(() => {
      setPicked([]);
      setResult(null);
    }, 900);
    return () => clearTimeout(id);
  }, [result]);

  const toggle = (id: string) => {
    if (result === 'yes') return;
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    if (next.length > 3) return;
    setPicked(next);
    if (next.length === 3) {
      const [a, b, c] = next.map((sid) => PRACTICE_CARDS.find((c) => c.id === sid)!);
      setResult(isSet(a, b, c) ? 'yes' : 'no');
    } else {
      setResult(null);
    }
  };

  return (
    <div className="howto-example howto-practice">
      <p className="howto-example-title">{t('howto.practiceTitle')}</p>
      <div className="howto-example-cards">
        {PRACTICE_CARDS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`example-card practice-card color-${c.color}${picked.includes(c.id) ? ' selected' : ''}`}
            aria-pressed={picked.includes(c.id)}
            onClick={() => toggle(c.id)}
          >
            <CardFace card={c} />
          </button>
        ))}
      </div>
      <p className="howto-example-why" role="status">
        {result === 'yes' ? t('howto.practiceYes') : result === 'no' ? t('howto.practiceNo') : ''}
      </p>
    </div>
  );
}

export function HowToPlay({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const dialogRef = useModalFocus<HTMLDivElement>();
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
        ref={dialogRef}
      >
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

        <PracticeRow />

        <button type="button" className="primary-btn" onClick={onClose}>
          {t('howto.close')}
        </button>
      </div>
    </div>
  );
}
