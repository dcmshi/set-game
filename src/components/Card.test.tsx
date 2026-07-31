import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card, ariaLabel } from './Card';
import type { Card as CardModel } from '../game/cards';

const card: CardModel = {
  id: '2-diamond-striped-red', count: 2, shape: 'diamond', shading: 'striped', color: 'red',
};

it('labels the card by its features and renders one shape per count', () => {
  render(<Card card={card} selected={false} hinted={false} feedback={null} onSelect={() => {}} />);
  const btn = screen.getByRole('button', { name: '2 striped red diamonds' });
  expect(btn.querySelectorAll('svg.shape')).toHaveLength(2);
});

it('reflects selected state via aria-pressed and fires onSelect', async () => {
  const onSelect = vi.fn();
  render(<Card card={card} selected={true} hinted={false} feedback={null} onSelect={onSelect} />);
  const btn = screen.getByRole('button');
  expect(btn).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(btn);
  expect(onSelect).toHaveBeenCalledWith('2-diamond-striped-red');
});

it('says in its label that it is hinted', () => {
  render(<Card card={card} selected={false} hinted={true} feedback={null} onSelect={() => {}} />);
  expect(screen.getByRole('button', { name: '2 striped red diamonds, hinted' })).toBeInTheDocument();
});

it('builds a singular label for a single shape', () => {
  expect(ariaLabel({ ...card, count: 1 })).toBe('1 striped red diamond');
});
