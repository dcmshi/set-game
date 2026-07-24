import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '../../test/renderWithI18n';
import { MpResults } from './MpResults';
import type { ScoreEntry } from '../../mp/protocol';

const finalScores: ScoreEntry[] = [
  { id: 'p1', name: 'Alice', score: 5 },
  { id: 'p2', name: 'Bob', score: 3 },
];

it('announces a single winner and lets the host rematch', async () => {
  const onRematch = vi.fn();
  renderWithI18n(
    <MpResults finalScores={finalScores} winnerIds={['p1']} isHost onRematch={onRematch} onLeave={() => {}} />
  );
  expect(screen.getByText(/Alice wins/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /rematch/i }));
  expect(onRematch).toHaveBeenCalled();
});

it('announces a draw when multiple winners tie', () => {
  renderWithI18n(
    <MpResults finalScores={finalScores} winnerIds={['p1', 'p2']} isHost={false} onRematch={() => {}} onLeave={() => {}} />
  );
  expect(screen.getByText(/draw/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /rematch/i })).not.toBeInTheDocument();
});
