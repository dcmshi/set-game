import { render } from '@testing-library/react';
import { CardFace } from './CardFace';
import { cardId, type Card, type Shading } from '../game/cards';

const card = (shading: Shading): Card => {
  const c = { count: 1, shape: 'diamond', shading, color: 'red' } as const;
  return { id: cardId(c), ...c };
};

// firstElementChild rather than a '>' selector: jsdom's selector engine misses
// SVG child combinators on every container after the first render in a test.
const shape = (shading: Shading) => {
  const { container } = render(<CardFace card={card(shading)} />);
  return container.querySelector('svg.shape')!.firstElementChild!;
};

// The suit colour arrives through the inherited `color` of the .color-<suit>
// class, so a palette swap is a CSS variable change with no JS involved.
it('strokes every shading with the inherited suit colour', () => {
  for (const shading of ['solid', 'striped', 'open'] as Shading[]) {
    expect(shape(shading).getAttribute('stroke')).toBe('currentColor');
  }
});

it('fills a solid shape with the suit colour and leaves an open one empty', () => {
  expect(shape('solid').getAttribute('fill')).toBe('currentColor');
  expect(shape('open').getAttribute('fill')).toBe('none');
});

it('fills a striped shape from the shared stripe pattern', () => {
  expect(shape('striped').getAttribute('fill')).toBe('url(#stripes-red)');
});
