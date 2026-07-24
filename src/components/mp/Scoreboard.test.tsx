import { screen } from '@testing-library/react';
import { renderWithI18n } from '../../test/renderWithI18n';
import { Scoreboard } from './Scoreboard';
import type { PlayerView } from '../../mp/protocol';

it('renders players sorted by score with the leader first', () => {
  const players: PlayerView[] = [
    { id: 'p1', name: 'Alice', score: 1, connected: true, spectator: false },
    { id: 'p2', name: 'Bob', score: 3, connected: true, spectator: false },
  ];
  renderWithI18n(<Scoreboard players={players} youId="p1" />);
  const items = screen.getAllByRole('listitem').map((li) => li.textContent);
  expect(items[0]).toContain('Bob');
  expect(items[0]).toContain('3');
});
