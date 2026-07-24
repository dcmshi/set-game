import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

const base = {
  title: 'Quit game?',
  body: 'Your current game will be lost.',
  confirmLabel: 'Quit',
  cancelLabel: 'Keep playing',
};

it('renders title/body and fires onConfirm', async () => {
  const onConfirm = vi.fn();
  render(<ConfirmDialog {...base} onConfirm={onConfirm} onCancel={() => {}} />);
  expect(screen.getByRole('dialog', { name: /quit game/i })).toBeInTheDocument();
  expect(screen.getByText(/your current game will be lost/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Quit' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

it('cancels via the cancel button and Escape', async () => {
  const onCancel = vi.fn();
  render(<ConfirmDialog {...base} onConfirm={() => {}} onCancel={onCancel} />);
  await userEvent.click(screen.getByRole('button', { name: /keep playing/i }));
  await userEvent.keyboard('{Escape}');
  expect(onCancel).toHaveBeenCalledTimes(2);
});
