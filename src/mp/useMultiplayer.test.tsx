import { renderHook, act } from '@testing-library/react';
import { useMultiplayer } from './useMultiplayer';
import type { ConnectHandlers, MpSocket } from './socket';
import type { ClientMessage, ServerMessage } from './protocol';

function makeFakeConnect() {
  const sent: ClientMessage[] = [];
  let handlers: ConnectHandlers | null = null;
  const socket: MpSocket = { send: (m) => sent.push(m), close: () => {} };
  const connectImpl = ((_url: string, h: ConnectHandlers) => {
    handlers = h;
    h.onStatus('connecting');
    return socket;
  }) as never;
  return {
    sent,
    connectImpl,
    open: () => handlers!.onStatus('open'),
    recv: (m: ServerMessage) => handlers!.onMessage(m),
  };
}

beforeEach(() => localStorage.clear());

it('creates a room and tracks lobby roster', () => {
  const f = makeFakeConnect();
  const { result } = renderHook(() => useMultiplayer('ws://x', f.connectImpl));
  act(() => f.open());
  act(() => result.current.createRoom('Alice'));
  expect(f.sent).toContainEqual({ type: 'createRoom', name: 'Alice' });

  act(() => f.recv({ type: 'joined', code: 'ABCD', you: { id: 'p1', token: 't1' }, phase: 'lobby' }));
  act(() =>
    f.recv({
      type: 'roomState',
      code: 'ABCD',
      phase: 'lobby',
      hostId: 'p1',
      players: [{ id: 'p1', name: 'Alice', score: 0, connected: true, spectator: false }],
    })
  );
  expect(result.current.code).toBe('ABCD');
  expect(result.current.phase).toBe('lobby');
  expect(result.current.players).toHaveLength(1);
  expect(localStorage.getItem('set-game:mp')).toContain('ABCD');
});

it('surfaces game state, claim results, and game over', () => {
  const f = makeFakeConnect();
  const { result } = renderHook(() => useMultiplayer('ws://x', f.connectImpl));
  act(() => f.open());
  act(() => f.recv({ type: 'joined', code: 'ABCD', you: { id: 'p1', token: 't1' }, phase: 'playing' }));
  act(() =>
    f.recv({
      type: 'gameState',
      board: [],
      scores: { p1: 2 },
      deckCount: 30,
      startedAt: 1000,
      yourLockoutUntil: 5000,
    })
  );
  expect(result.current.scores.p1).toBe(2);
  expect(result.current.lockoutUntil).toBe(5000);

  act(() => result.current.claim(['a', 'b', 'c']));
  expect(f.sent).toContainEqual({ type: 'claim', cardIds: ['a', 'b', 'c'] });

  act(() => f.recv({ type: 'claimResult', result: 'invalid', lockoutUntil: 6000 }));
  expect(result.current.lastClaim).toBe('invalid');

  act(() =>
    f.recv({
      type: 'gameOver',
      finalScores: [{ id: 'p1', name: 'Alice', score: 2 }],
      winnerIds: ['p1'],
      durationMs: 9000,
    })
  );
  expect(result.current.results?.winnerIds).toEqual(['p1']);
});

it('maps error codes to messages', () => {
  const f = makeFakeConnect();
  const { result } = renderHook(() => useMultiplayer('ws://x', f.connectImpl));
  act(() => f.open());
  act(() => f.recv({ type: 'error', code: 'full', message: 'x' }));
  expect(result.current.error).toBe('full');
});

it('auto-rejoins with a stored token when the socket opens', () => {
  localStorage.setItem('set-game:mp', JSON.stringify({ code: 'WXYZ', token: 'tok' }));
  const f = makeFakeConnect();
  renderHook(() => useMultiplayer('ws://x', f.connectImpl));
  act(() => f.open());
  expect(f.sent).toContainEqual({ type: 'rejoin', code: 'WXYZ', token: 'tok' });
});
