import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { newGame } from './game/engine';
import { findAnySet, isSet } from './game/set';
import { ariaLabel } from './components/Card';
import type { Card } from './game/cards';

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

it('flashes a +5s chip under the timer on a wrong pick', async () => {
  const seed = 5;
  const board = newGame(seed).board;
  let triple: Card[] | null = null;
  outer: for (let i = 0; i < board.length; i++) {
    for (let j = i + 1; j < board.length; j++) {
      for (let k = j + 1; k < board.length; k++) {
        if (!isSet(board[i], board[j], board[k])) {
          triple = [board[i], board[j], board[k]];
          break outer;
        }
      }
    }
  }
  render(<App seed={seed} />);
  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  for (const card of triple!) {
    await userEvent.click(screen.getByRole('button', { name: ariaLabel(card) }));
  }
  expect(await screen.findByText('+5s')).toBeInTheDocument();
});

it('flashes a +15s chip under the timer when a hint is taken', async () => {
  render(<App seed={5} />);
  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  await userEvent.click(screen.getByRole('button', { name: /hint/i }));
  expect(await screen.findByText('+15s')).toBeInTheDocument();
});

it('switches to multiplayer mode without crashing (hooks-order regression)', async () => {
  render(<App seed={5} />);
  await userEvent.click(screen.getByRole('button', { name: /play with friends/i }));
  // MultiplayerApp mounts; with a socket that never opens it shows the waking state.
  expect(screen.getByText(/waking up the server/i)).toBeInTheDocument();
});

it('quits an in-progress single-player game only after confirming', async () => {
  render(<App seed={5} />);
  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  expect(screen.getByRole('timer')).toBeInTheDocument();

  // Open the confirm, then cancel — still in the game.
  await userEvent.click(screen.getByRole('button', { name: /quit/i }));
  await userEvent.click(screen.getByRole('button', { name: /keep playing/i }));
  expect(screen.getByRole('timer')).toBeInTheDocument();

  // Open again and confirm — back on the start screen.
  await userEvent.click(screen.getByRole('button', { name: /quit/i }));
  const dialog = screen.getByRole('dialog', { name: /quit game/i });
  await userEvent.click(within(dialog).getByRole('button', { name: /quit/i }));
  expect(screen.getByRole('button', { name: /^start$/i })).toBeInTheDocument();
});

// Duplicate ids are invalid HTML, and which #stripes-red a shape resolves to
// would then depend on document order.
it('defines each stripe pattern once, even with the how-to modal over the board', async () => {
  render(<App seed={5} />);
  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  expect(document.querySelectorAll('#stripes-red')).toHaveLength(1);

  await userEvent.click(screen.getByRole('button', { name: /how to play/i }));
  expect(screen.getByRole('dialog', { name: /how to play/i })).toBeInTheDocument();
  expect(document.querySelectorAll('#stripes-red')).toHaveLength(1);
  expect(document.querySelectorAll('#stripes-green')).toHaveLength(1);
  expect(document.querySelectorAll('#stripes-purple')).toHaveLength(1);
});

// A player who needs the colourblind palette needs it before starting and
// again mid-game, so the control has to be reachable from both.
it('offers the colourblind palette on the start screen and in the top bar', async () => {
  render(<App seed={5} />);
  expect(screen.getByRole('button', { name: /colorblind/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  expect(screen.getByRole('button', { name: /colorblind/i })).toBeInTheDocument();
});

it('tracks the current screen on the root element so static copy can hide', async () => {
  render(<App seed={5} />);
  expect(document.documentElement.dataset.appScreen).toBe('start');
  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  expect(document.documentElement.dataset.appScreen).toBe('playing');
});
