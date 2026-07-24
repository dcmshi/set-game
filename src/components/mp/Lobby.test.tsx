import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '../../test/renderWithI18n';
import { Lobby } from './Lobby';
import type { PlayerView } from '../../mp/protocol';

const players: PlayerView[] = [
  { id: 'p1', name: 'Alice', score: 0, connected: true, spectator: false },
  { id: 'p2', name: 'Bob', score: 0, connected: true, spectator: false },
];

it('shows the room code and roster, and the host can start', async () => {
  const onStart = vi.fn();
  renderWithI18n(
    <Lobby code="ABCD" players={players} hostId="p1" youId="p1" isHost onStart={onStart} onLeave={() => {}} />
  );
  expect(screen.getByText('ABCD')).toBeInTheDocument();
  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('Bob')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /start game/i }));
  expect(onStart).toHaveBeenCalled();
});

it('hides the start button for non-hosts and shows a waiting note', () => {
  renderWithI18n(
    <Lobby code="ABCD" players={players} hostId="p1" youId="p2" isHost={false} onStart={() => {}} onLeave={() => {}} />
  );
  expect(screen.queryByRole('button', { name: /start game/i })).not.toBeInTheDocument();
  expect(screen.getByText(/waiting for the host/i)).toBeInTheDocument();
});

it('fires onLeave when the leave button is clicked', async () => {
  const onLeave = vi.fn();
  renderWithI18n(
    <Lobby code="ABCD" players={players} hostId="p1" youId="p1" isHost onStart={() => {}} onLeave={onLeave} />
  );
  await userEvent.click(screen.getByRole('button', { name: /leave/i }));
  expect(onLeave).toHaveBeenCalled();
});
