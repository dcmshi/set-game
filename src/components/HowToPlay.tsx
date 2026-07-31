import { useEffect, useRef } from 'react';
import { useT } from '../i18n/LanguageContext';
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
