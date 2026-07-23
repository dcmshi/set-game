import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Board } from './Board';
import { newGame } from '../game/engine';

it('renders one button per board card and forwards clicks', async () => {
  const state = newGame(5);
  const onSelect = vi.fn();
  render(<Board state={state} onSelect={onSelect} />);
  const buttons = screen.getAllByRole('button');
  expect(buttons).toHaveLength(state.board.length);
  await userEvent.click(buttons[0]);
  expect(onSelect).toHaveBeenCalledWith(state.board[0].id);
});
