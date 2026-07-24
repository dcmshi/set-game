import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  HowToPlay,
  EXAMPLE_VALID,
  EXAMPLE_INVALID_A,
  EXAMPLE_INVALID_B,
} from './HowToPlay';
import { isSet } from '../game/set';

it('examples agree with the real Set rule', () => {
  expect(isSet(...EXAMPLE_VALID)).toBe(true);
  expect(isSet(...EXAMPLE_INVALID_A)).toBe(false);
  expect(isSet(...EXAMPLE_INVALID_B)).toBe(false);
});

it('renders the dialog and closes via the close button', async () => {
  const onClose = vi.fn();
  render(<HowToPlay onClose={onClose} />);
  expect(screen.getByRole('dialog', { name: /how to play/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /close/i }));
  expect(onClose).toHaveBeenCalled();
});
