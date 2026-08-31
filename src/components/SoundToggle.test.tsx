import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SoundToggle } from './SoundToggle';
import { getSoundEnabled } from '../storage/soundPref';

beforeEach(() => localStorage.clear());

it('starts off (opt-in) and toggles the stored preference', async () => {
  render(<SoundToggle />);
  const btn = screen.getByRole('button', { name: /sound/i });
  expect(btn).toHaveAttribute('aria-pressed', 'false');

  await userEvent.click(btn);
  expect(btn).toHaveAttribute('aria-pressed', 'true');
  expect(getSoundEnabled()).toBe(true);

  await userEvent.click(btn);
  expect(btn).toHaveAttribute('aria-pressed', 'false');
  expect(getSoundEnabled()).toBe(false);
});

it('restores a previously enabled preference', () => {
  localStorage.setItem('set-game:sound', 'on');
  render(<SoundToggle />);
  expect(screen.getByRole('button', { name: /sound/i })).toHaveAttribute('aria-pressed', 'true');
});
