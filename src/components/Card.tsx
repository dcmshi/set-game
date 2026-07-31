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
  /** Set by a board using a roving tabindex; on its own a card is tabbable. */
  tabIndex?: number;
  onSelect: (id: string) => void;
}

export function Card({ card, selected, hinted, feedback, tabIndex, onSelect }: CardProps) {
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
      aria-label={cardAriaLabel(card, lang, hinted)}
      aria-pressed={selected}
      tabIndex={tabIndex}
      onClick={() => onSelect(card.id)}
    >
      <CardFace card={card} />
    </button>
  );
}
