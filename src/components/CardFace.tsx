import type { Card as CardModel, Color, Shape, Shading } from '../game/cards';
import { COLOR_HEX } from './SetSvgDefs';

// Shapes drawn in a portrait 50x100 viewBox, laid out in a row on the card.
// The squiggle is a fat offset-ribbon around a sine-wave spine with rounded
// semicircular end caps — a chunky body so the striped shading reads clearly.
const SHAPE_PATH: Record<Exclude<Shape, 'oval'>, string> = {
  diamond: 'M25 4 L47 50 L25 96 L3 50 Z',
  squiggle:
    'M33.94 8.58 L35.01 10.08 L36.11 11.65 L37.23 13.29 L38.34 15.02 L39.43 16.85 L40.46 18.77 L41.43 20.80 L42.28 22.95 L43.00 25.21 L43.54 27.57 L43.88 30.02 L44.00 32.50 L43.88 34.98 L43.54 37.43 L43.00 39.79 L42.28 42.05 L41.43 44.20 L40.46 46.23 L39.43 48.15 L38.34 49.98 L37.23 51.71 L36.11 53.35 L35.01 54.92 L33.94 56.42 L32.92 57.84 L31.97 59.19 L31.10 60.46 L30.34 61.64 L29.69 62.74 L29.15 63.73 L28.73 64.61 L28.42 65.38 L28.22 66.04 L28.09 66.59 L28.02 67.07 L28.00 67.50 L28.02 67.93 L28.09 68.41 L28.22 68.96 L28.42 69.62 L28.73 70.39 L29.15 71.27 L29.69 72.26 L30.34 73.36 L31.10 74.54 L31.97 75.81 L32.92 77.16 L33.94 78.58 L35.02 80.45 L35.71 82.49 L35.99 84.63 L35.85 86.78 L35.30 88.86 L34.35 90.80 L33.04 92.51 L31.42 93.94 L29.55 95.02 L27.51 95.71 L25.37 95.99 L23.22 95.85 L21.14 95.30 L19.20 94.35 L17.49 93.04 L16.06 91.42 L14.99 89.92 L13.89 88.35 L12.77 86.71 L11.66 84.98 L10.57 83.15 L9.54 81.23 L8.57 79.20 L7.72 77.05 L7.00 74.79 L6.46 72.43 L6.12 69.98 L6.00 67.50 L6.12 65.02 L6.46 62.57 L7.00 60.21 L7.72 57.95 L8.57 55.80 L9.54 53.77 L10.57 51.85 L11.66 50.02 L12.77 48.29 L13.89 46.65 L14.99 45.08 L16.06 43.58 L17.08 42.16 L18.03 40.81 L18.90 39.54 L19.66 38.36 L20.31 37.26 L20.85 36.27 L21.27 35.39 L21.58 34.62 L21.78 33.96 L21.91 33.41 L21.98 32.93 L22.00 32.50 L21.98 32.07 L21.91 31.59 L21.78 31.04 L21.58 30.38 L21.27 29.61 L20.85 28.73 L20.31 27.74 L19.66 26.64 L18.90 25.46 L18.03 24.19 L17.08 22.84 L16.06 21.42 L14.98 19.55 L14.29 17.51 L14.01 15.37 L14.15 13.22 L14.70 11.14 L15.65 9.20 L16.96 7.49 L18.58 6.06 L20.45 4.98 L22.49 4.29 L24.63 4.01 L26.78 4.15 L28.86 4.70 L30.80 5.65 L32.51 6.96 Z',
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
