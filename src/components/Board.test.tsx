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

// The board is one Tab stop; arrow keys move within it.
describe('keyboard navigation', () => {
  const renderBoard = () => {
    render(<Board state={newGame(5)} onSelect={() => {}} />);
    return screen.getAllByRole('button');
  };

  it('puts exactly one card in the tab order', () => {
    const cards = renderBoard();
    expect(cards.filter((c) => c.tabIndex === 0)).toHaveLength(1);
    expect(cards[0].tabIndex).toBe(0);
  });

  it('walks focus across the row with the arrow keys', async () => {
    const cards = renderBoard();
    cards[0].focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(cards[1]).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(cards[5]).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(cards[4]).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(cards[0]).toHaveFocus();
  });

  it('hands the tab stop to whichever card focus reached', async () => {
    const cards = renderBoard();
    cards[0].focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(cards[1].tabIndex).toBe(0);
    expect(cards[0].tabIndex).toBe(-1);
  });

  it('keeps the tab stop on a clicked card so arrows continue from there', async () => {
    const cards = renderBoard();
    await userEvent.click(cards[6]);

    await userEvent.keyboard('{ArrowRight}');
    expect(cards[7]).toHaveFocus();
  });

  it('leaves focus alone at the edge of the board', async () => {
    const cards = renderBoard();
    cards[0].focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(cards[0]).toHaveFocus();
  });
});
