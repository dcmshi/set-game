import type { Card as CardModel, Color, Shape, Shading } from '../game/cards';
import { COLOR_HEX } from './SetSvgDefs';

// Shapes drawn in a portrait 50x100 viewBox, laid out in a row on the card.
// The squiggle is a smooth closed S-curve (built from an offset ribbon around
// a wavy spine with rounded end caps) so it reads clearly as the classic Set
// "squiggle" symbol rather than a rough approximation.
const SHAPE_PATH: Record<Exclude<Shape, 'oval'>, string> = {
  diamond: 'M25 4 L47 50 L25 96 L3 50 Z',
  squiggle:
    'M29.06 5.03 C28.30 4.28 28.48 4.49 28.14 4.32 C27.79 4.15 27.39 4.03 27.01 4.01 C26.62 3.98 26.21 4.03 25.85 4.15 C25.48 4.27 25.12 4.48 24.83 4.73 C24.54 4.98 24.28 5.32 24.11 5.66 C23.94 6.00 23.83 6.40 23.80 6.79 C23.77 7.17 23.83 7.58 23.95 7.95 C24.07 8.31 23.94 8.12 24.53 8.97 C25.11 9.81 26.55 11.68 27.44 13.00 C28.32 14.31 29.15 15.61 29.83 16.86 C30.50 18.10 31.07 19.31 31.48 20.44 C31.90 21.57 32.16 22.64 32.31 23.66 C32.45 24.67 32.46 25.58 32.36 26.52 C32.27 27.45 32.07 28.31 31.75 29.26 C31.43 30.20 31.00 31.14 30.45 32.16 C29.89 33.17 29.20 34.24 28.40 35.35 C27.61 36.46 26.68 37.62 25.69 38.81 C24.70 40.00 23.60 41.24 22.49 42.50 C21.38 43.77 20.19 45.06 19.05 46.40 C17.91 47.73 16.73 49.09 15.65 50.50 C14.57 51.91 13.50 53.35 12.57 54.85 C11.64 56.35 10.76 57.89 10.08 59.49 C9.41 61.09 8.83 62.76 8.50 64.44 C8.17 66.12 8.03 67.88 8.11 69.58 C8.20 71.27 8.53 72.98 9.02 74.59 C9.50 76.20 10.22 77.76 11.03 79.24 C11.83 80.73 12.82 82.14 13.85 83.51 C14.88 84.89 16.04 86.20 17.20 87.50 C18.37 88.79 19.62 90.05 20.84 91.29 C22.07 92.54 23.91 94.35 24.53 94.97 C25.14 95.58 24.37 94.85 24.53 94.97 C24.68 95.08 25.11 95.51 25.45 95.68 C25.79 95.85 26.20 95.97 26.58 95.99 C26.96 96.02 27.38 95.97 27.74 95.85 C28.10 95.73 28.47 95.52 28.76 95.27 C29.05 95.02 29.30 94.68 29.48 94.34 C29.65 94.00 29.76 93.60 29.79 93.21 C29.81 92.83 29.76 92.42 29.64 92.05 C29.52 91.69 29.68 91.90 29.06 91.03 C28.44 90.17 26.92 88.25 25.91 86.89 C24.90 85.53 23.88 84.18 22.99 82.87 C22.10 81.56 21.25 80.26 20.57 79.03 C19.88 77.80 19.30 76.60 18.88 75.48 C18.45 74.36 18.17 73.31 18.01 72.32 C17.84 71.32 17.82 70.43 17.89 69.51 C17.96 68.60 18.13 67.76 18.42 66.83 C18.71 65.91 19.11 64.97 19.63 63.97 C20.16 62.96 20.82 61.90 21.59 60.79 C22.35 59.68 23.26 58.51 24.22 57.32 C25.19 56.12 26.27 54.88 27.36 53.60 C28.45 52.33 29.63 51.02 30.76 49.68 C31.88 48.34 33.05 46.97 34.12 45.55 C35.19 44.14 36.26 42.70 37.18 41.20 C38.10 39.70 38.98 38.16 39.65 36.57 C40.32 34.98 40.90 33.32 41.23 31.65 C41.56 29.99 41.71 28.25 41.64 26.57 C41.56 24.90 41.24 23.21 40.77 21.62 C40.30 20.02 39.59 18.49 38.80 17.01 C38.01 15.54 37.04 14.15 36.02 12.78 C35.00 11.42 33.85 10.11 32.69 8.82 C31.53 7.53 29.82 5.79 29.06 5.03 Z',
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
