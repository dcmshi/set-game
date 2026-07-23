import type { Card as CardModel, Color, Shape, Shading } from '../game/cards';
import { COLOR_HEX } from './SetSvgDefs';

// Shapes drawn in a portrait 50x100 viewBox, laid out in a row on the card.
// The squiggle is an approximation of the classic Set curve — fine to tune later.
const SHAPE_PATH: Record<Exclude<Shape, 'oval'>, string> = {
  diamond: 'M25 4 L47 50 L25 96 L3 50 Z',
  squiggle:
    'M32 6 C 10 10 12 34 22 46 C 30 56 8 66 14 82 C 18 94 40 96 34 80 C 30 66 48 60 40 44 C 34 32 52 20 32 6 Z',
};

export function ariaLabel(c: CardModel): string {
  const noun = c.shape + (c.count > 1 ? 's' : '');
  return `${c.count} ${c.shading} ${c.color} ${noun}`;
}

function ShapeSvg({ shape, shading, color }: { shape: Shape; shading: Shading; color: Color }) {
  const stroke = COLOR_HEX[color];
  const fill =
    shading === 'solid' ? stroke : shading === 'striped' ? `url(#stripes-${color})` : 'none';
  return (
    <svg className="shape" viewBox="0 0 50 100" aria-hidden="true">
      {shape === 'oval' ? (
        <rect x="6" y="6" width="38" height="88" rx="19" fill={fill} stroke={stroke} strokeWidth="4" />
      ) : (
        <path d={SHAPE_PATH[shape]} fill={fill} stroke={stroke} strokeWidth="4" />
      )}
    </svg>
  );
}

interface CardProps {
  card: CardModel;
  selected: boolean;
  hinted: boolean;
  feedback: 'correct' | 'wrong' | null;
  onSelect: (id: string) => void;
}

export function Card({ card, selected, hinted, feedback, onSelect }: CardProps) {
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
      aria-label={ariaLabel(card)}
      aria-pressed={selected}
      onClick={() => onSelect(card.id)}
    >
      {Array.from({ length: card.count }).map((_, i) => (
        <ShapeSvg key={i} shape={card.shape} shading={card.shading} color={card.color} />
      ))}
    </button>
  );
}
