import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaletteToggle } from './PaletteToggle';
import { getStoredPalette } from '../theme/palette';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.palette;
});

const toggle = () => screen.getByRole('button', { name: /colorblind/i });

it('starts unpressed on the classic palette', () => {
  render(<PaletteToggle />);
  expect(toggle()).toHaveAttribute('aria-pressed', 'false');
});

it('switches the palette on the root element when pressed', async () => {
  render(<PaletteToggle />);
  await userEvent.click(toggle());

  expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  expect(document.documentElement.dataset.palette).toBe('colorblind');
});

it('switches back on a second press', async () => {
  render(<PaletteToggle />);
  await userEvent.click(toggle());
  await userEvent.click(toggle());

  expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  expect(document.documentElement.dataset.palette).toBe('classic');
});

it('remembers the choice for the next visit', async () => {
  const { unmount } = render(<PaletteToggle />);
  await userEvent.click(toggle());
  expect(getStoredPalette()).toBe('colorblind');
  unmount();

  render(<PaletteToggle />);
  expect(toggle()).toHaveAttribute('aria-pressed', 'true');
});
