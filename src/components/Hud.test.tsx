import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Hud } from './Hud';

it('shows counts and fires the hint handler', async () => {
  const onHint = vi.fn();
  render(<Hud deckCount={42} mistakes={3} setsFound={13} endgame={false} onHint={onHint} hintDisabled={false} />);
  expect(screen.getByText('42')).toBeInTheDocument();
  expect(screen.getByText('3')).toBeInTheDocument();
  expect(screen.getByText('13')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /hint/i }));
  expect(onHint).toHaveBeenCalled();
});

it('disables the hint button when told to', () => {
  render(<Hud deckCount={0} mistakes={0} setsFound={0} endgame={false} onHint={() => {}} hintDisabled={true} />);
  expect(screen.getByRole('button', { name: /hint/i })).toBeDisabled();
});

it('shows the final-cards cue only in the endgame', () => {
  const { rerender } = render(
    <Hud deckCount={3} mistakes={0} setsFound={25} endgame={false} onHint={() => {}} hintDisabled={false} />
  );
  expect(screen.queryByText(/final cards/i)).not.toBeInTheDocument();
  rerender(
    <Hud deckCount={0} mistakes={0} setsFound={25} endgame={true} onHint={() => {}} hintDisabled={false} />
  );
  expect(screen.getByText(/final cards/i)).toBeInTheDocument();
});
