import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  HowToPlay,
  EXAMPLE_VALID,
  EXAMPLE_INVALID_A,
  EXAMPLE_INVALID_B,
  PRACTICE_CARDS,
} from './HowToPlay';
import { isSet } from '../game/set';
import type { Card } from '../game/cards';

it('examples agree with the real Set rule', () => {
  expect(isSet(...EXAMPLE_VALID)).toBe(true);
  expect(isSet(...EXAMPLE_INVALID_A)).toBe(false);
  expect(isSet(...EXAMPLE_INVALID_B)).toBe(false);
});

function allSets(cards: Card[]): number {
  let n = 0;
  for (let i = 0; i < cards.length - 2; i++)
    for (let j = i + 1; j < cards.length - 1; j++)
      for (let k = j + 1; k < cards.length; k++)
        if (isSet(cards[i], cards[j], cards[k])) n++;
  return n;
}

it('practice row hides exactly one Set', () => {
  expect(allSets(PRACTICE_CARDS)).toBe(1);
});

it('renders the dialog and closes via the close button', async () => {
  const onClose = vi.fn();
  render(<HowToPlay onClose={onClose} />);
  expect(screen.getByRole('dialog', { name: /how to play/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /close/i }));
  expect(onClose).toHaveBeenCalled();
});

const practiceButtons = () =>
  document.querySelectorAll<HTMLButtonElement>('.practice-card');

// PRACTICE_CARDS[1..3] are the one true Set; [0, 4, 5] are decoys.
it('practice row judges picks against the real rule', async () => {
  render(<HowToPlay onClose={() => {}} />);
  const cards = [...practiceButtons()];
  expect(cards).toHaveLength(6);

  await userEvent.click(cards[0]);
  await userEvent.click(cards[4]);
  await userEvent.click(cards[5]);
  expect(screen.getByRole('status')).toHaveTextContent(/not a set/i);

  // Wrong trio clears itself after a beat, then the right trio is accepted.
  await vi.waitFor(() => expect(screen.getByRole('status')).toBeEmptyDOMElement(), {
    timeout: 2000,
  });
  await userEvent.click(cards[1]);
  await userEvent.click(cards[2]);
  await userEvent.click(cards[3]);
  expect(screen.getByRole('status')).toHaveTextContent(/that's a set/i);
});
