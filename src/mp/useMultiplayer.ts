import { useCallback, useEffect, useRef, useState } from 'react';
import { connect as defaultConnect, type MpSocket, type SocketStatus } from './socket';
import type { Card } from '../game/cards';
import type { ClientMessage, ServerMessage, PlayerView, ScoreEntry, Phase } from './protocol';

const STORE_KEY = 'set-game:mp';

interface Stored {
  code: string;
  token: string;
}

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}
function saveStored(s: Stored | null): void {
  try {
    if (s) localStorage.setItem(STORE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

export interface Mp {
  status: SocketStatus | 'idle';
  phase: Phase | 'none';
  code: string | null;
  you: { id: string; token: string } | null;
  players: PlayerView[];
  hostId: string | null;
  board: Card[];
  scores: Record<string, number>;
  deckCount: number;
  startedAt: number;
  lockoutUntil: number;
  lastClaim: 'ok' | 'invalid' | 'taken' | null;
  results: { finalScores: ScoreEntry[]; winnerIds: string[]; durationMs: number } | null;
  error: string | null;
  createRoom(name: string): void;
  join(code: string, name: string): void;
  start(): void;
  claim(ids: [string, string, string]): void;
  rematch(): void;
  leave(): void;
}

export function useMultiplayer(url: string, connectImpl: typeof defaultConnect = defaultConnect): Mp {
  const [status, setStatus] = useState<SocketStatus | 'idle'>('idle');
  const [phase, setPhase] = useState<Phase | 'none'>('none');
  const [code, setCode] = useState<string | null>(null);
  const [you, setYou] = useState<{ id: string; token: string } | null>(null);
  const [players, setPlayers] = useState<PlayerView[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [board, setBoard] = useState<Card[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [deckCount, setDeckCount] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [lastClaim, setLastClaim] = useState<'ok' | 'invalid' | 'taken' | null>(null);
  const [results, setResults] = useState<Mp['results']>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<MpSocket | null>(null);
  const send = useCallback((msg: ClientMessage) => socketRef.current?.send(msg), []);

  useEffect(() => {
    const socket = connectImpl(url, {
      onStatus: (s) => {
        setStatus(s);
        if (s === 'open') {
          const stored = loadStored();
          if (stored) send({ type: 'rejoin', code: stored.code, token: stored.token });
        }
      },
      onMessage: (m: ServerMessage) => {
        switch (m.type) {
          case 'joined':
            setCode(m.code);
            setYou(m.you);
            setPhase(m.phase);
            setError(null);
            saveStored({ code: m.code, token: m.you.token });
            break;
          case 'roomState':
            setPhase(m.phase);
            setPlayers(m.players);
            setHostId(m.hostId);
            break;
          case 'gameState':
            setBoard(m.board);
            setScores(m.scores);
            setDeckCount(m.deckCount);
            setStartedAt(m.startedAt);
            setLockoutUntil(m.yourLockoutUntil);
            break;
          case 'claimResult':
            setLastClaim(m.result);
            if (m.lockoutUntil) setLockoutUntil(m.lockoutUntil);
            break;
          case 'gameOver':
            setResults({ finalScores: m.finalScores, winnerIds: m.winnerIds, durationMs: m.durationMs });
            setPhase('results');
            break;
          case 'error':
            setError(m.code);
            break;
        }
      },
    });
    socketRef.current = socket;
    return () => socket.close();
  }, [url, connectImpl, send]);

  const createRoom = useCallback(
    (name: string) => {
      setError(null);
      send({ type: 'createRoom', name });
    },
    [send]
  );
  const join = useCallback(
    (c: string, name: string) => {
      setError(null);
      send({ type: 'joinRoom', code: c, name });
    },
    [send]
  );
  const start = useCallback(() => send({ type: 'startGame' }), [send]);
  const claim = useCallback((ids: [string, string, string]) => send({ type: 'claim', cardIds: ids }), [send]);
  const rematch = useCallback(() => {
    setResults(null);
    send({ type: 'rematch' });
  }, [send]);
  const leave = useCallback(() => {
    send({ type: 'leave' });
    saveStored(null);
    setPhase('none');
    setCode(null);
    setResults(null);
  }, [send]);

  return {
    status,
    phase,
    code,
    you,
    players,
    hostId,
    board,
    scores,
    deckCount,
    startedAt,
    lockoutUntil,
    lastClaim,
    results,
    error,
    createRoom,
    join,
    start,
    claim,
    rematch,
    leave,
  };
}
