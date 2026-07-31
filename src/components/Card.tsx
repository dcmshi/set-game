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
      aria-label={cardAriaLabel(card, lang, hinted)}
      aria-pressed={selected}
      onClick={() => onSelect(card.id)}
    >
      <CardFace card={card} />
    </button>
  );
}
