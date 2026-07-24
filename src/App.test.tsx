import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { newGame } from './game/engine';
import { findAnySet } from './game/set';
import { ariaLabel } from './components/Card';

// jsdom has no WebSocket; stub one that never opens so the multiplayer container
// can mount without a real connection.
class MockWS {
  static OPEN = 1;
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  send() {}
  close() {}
}
beforeAll(() => {
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = MockWS;
});

it('shows the start screen, then the board on Start', async () => {
  render(<App seed={5} />);
  await userEvent.click(screen.getByRole('button', { name: /start/i }));
  const board = newGame(5).board;
  expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(board.length);
  expect(screen.getByRole('timer')).toBeInTheDocument();
});

it('removes a valid Set after it is selected', async () => {
  const seed = 5;
  const set = findAnySet(newGame(seed).board)!;
  render(<App seed={seed} />);
  await userEvent.click(screen.getByRole('button', { name: /start/i }));
  for (const card of set) {
    await userEvent.click(screen.getByRole('button', { name: ariaLabel(card) }));
  }
  await waitFor(
    () => expect(screen.queryByRole('button', { name: ariaLabel(set[0]) })).not.toBeInTheDocument(),
    { timeout: 1500 }
  );
});

it('switches to multiplayer mode without crashing (hooks-order regression)', async () => {
  render(<App seed={5} />);
  await userEvent.click(screen.getByRole('button', { name: /play with friends/i }));
  // MultiplayerApp mounts; with a socket that never opens it shows the waking state.
  expect(screen.getByText(/waking up the server/i)).toBeInTheDocument();
});
