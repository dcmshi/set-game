import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '../../test/renderWithI18n';
import { MpBoard } from './MpBoard';
import { cardId, type Card } from '../../game/cards';
import { cardAriaLabel } from '../../i18n/cardAria';

const mk = (c: Omit<Card, 'id'>): Card => ({ id: cardId(c), ...c });
const board: Card[] = [
  mk({ count: 1, shape: 'diamond', shading: 'solid', color: 'red' }),
  mk({ count: 2, shape: 'squiggle', shading: 'striped', color: 'green' }),
  mk({ count: 3, shape: 'oval', shading: 'open', color: 'purple' }),
];

it('claims after three cards are selected, then clears selection', async () => {
  const onClaim = vi.fn();
  renderWithI18n(<MpBoard board={board} lockoutUntil={0} wrongFlash={false} onClaim={onClaim} />);
  for (const c of board) {
    await userEvent.click(screen.getByRole('button', { name: cardAriaLabel(c, 'en') }));
  }
  expect(onClaim).toHaveBeenCalledWith([board[0].id, board[1].id, board[2].id]);
});

it('shows a lockout badge while locked out', () => {
  renderWithI18n(<MpBoard board={board} lockoutUntil={Date.now() + 5000} wrongFlash={false} onClaim={() => {}} />);
  expect(screen.getByText(/locked/i)).toBeInTheDocument();
});
