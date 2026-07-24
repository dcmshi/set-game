import { MpGame, MAX_PLAYERS } from './game';
import type { PlayerView, ScoreEntry, Phase } from '../../src/mp/protocol';

export interface Player {
  id: string;
  name: string;
  token: string;
  connected: boolean;
  spectator: boolean;
  joinedAt: number;
}

type JoinOk = { room: Room; player: Player };
type JoinErr = { error: string };

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O

export interface IdGen {
  id(): string;
  token(): string;
  code(): string;
}

const defaultIdGen: IdGen = {
  id: () => crypto.randomUUID(),
  token: () => crypto.randomUUID(),
  code: () =>
    Array.from({ length: 4 }, () =>
      CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    ).join(''),
};

export class Room {
  phase: Phase = 'lobby';
  hostId = '';
  game: MpGame;
  lastActivity: number;

  private players = new Map<string, Player>();

  constructor(
    readonly code: string,
    private now: () => number,
    private gen: IdGen
  ) {
    this.game = new MpGame(now);
    this.lastActivity = now();
  }

  addPlayer(name: string): Player {
    const player: Player = {
      id: this.gen.id(),
      name,
      token: this.gen.token(),
      connected: true,
      spectator: this.phase === 'playing',
      joinedAt: this.now(),
    };
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    this.touch();
    return player;
  }

  rejoin(token: string): Player | null {
    const player = [...this.players.values()].find((p) => p.token === token);
    if (!player) return null;
    player.connected = true;
    this.touch();
    return player;
  }

  setConnected(id: string, connected: boolean): void {
    const p = this.players.get(id);
    if (p) p.connected = connected;
    this.touch();
  }

  removePlayer(id: string): void {
    const wasHost = this.hostId === id;
    this.players.delete(id);
    if (wasHost) {
      const next = [...this.players.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      this.hostId = next ? next.id : '';
    }
    this.touch();
  }

  activePlayerIds(): string[] {
    return [...this.players.values()].filter((p) => !p.spectator).map((p) => p.id);
  }

  start(seed: number): void {
    this.phase = 'playing';
    this.game.deal(this.activePlayerIds(), seed);
    this.touch();
  }

  rematch(seed: number): void {
    for (const p of this.players.values()) p.spectator = false;
    this.phase = 'playing';
    this.game.deal(this.activePlayerIds(), seed);
    this.touch();
  }

  claim(id: string, cardIds: [string, string, string]) {
    const p = this.players.get(id);
    this.touch();
    if (!p || p.spectator) return { result: 'taken' as const };
    const r = this.game.claim(id, cardIds);
    if (this.game.over) this.phase = 'results';
    return r;
  }

  roster(): PlayerView[] {
    const scores = this.game.scores;
    return [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      score: scores[p.id] ?? 0,
      connected: p.connected,
      spectator: p.spectator,
    }));
  }

  gameStateFor(id: string) {
    return {
      board: this.game.board,
      scores: this.game.scores,
      deckCount: this.game.deckCount,
      startedAt: this.game.startedAt,
      yourLockoutUntil: this.game.lockoutFor(id),
    };
  }

  results(): { finalScores: ScoreEntry[]; winnerIds: string[]; durationMs: number } {
    const scores = this.game.scores;
    const finalScores: ScoreEntry[] = [...this.players.values()]
      .filter((p) => !p.spectator)
      .map((p) => ({ id: p.id, name: p.name, score: scores[p.id] ?? 0 }))
      .sort((a, b) => b.score - a.score);
    return {
      finalScores,
      winnerIds: this.game.winnerIds(),
      durationMs: this.now() - this.game.startedAt,
    };
  }

  size(): number {
    return this.players.size;
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  private touch(): void {
    this.lastActivity = this.now();
  }
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(
    private now: () => number = () => Date.now(),
    private gen: IdGen = defaultIdGen
  ) {}

  create(name: string): JoinOk {
    let code = this.gen.code();
    while (this.rooms.has(code)) code = this.gen.code();
    const room = new Room(code, this.now, this.gen);
    this.rooms.set(code, room);
    const player = room.addPlayer(name);
    return { room, player };
  }

  join(code: string, name: string): JoinOk | JoinErr {
    const room = this.rooms.get(code);
    if (!room) return { error: 'not_found' };
    if (room.size() >= MAX_PLAYERS) return { error: 'full' };
    return { room, player: room.addPlayer(name) };
  }

  rejoin(code: string, token: string): JoinOk | JoinErr {
    const room = this.rooms.get(code);
    if (!room) return { error: 'not_found' };
    const player = room.rejoin(token);
    if (!player) return { error: 'no_seat' };
    return { room, player };
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  sweep(ttlMs: number): void {
    const now = this.now();
    for (const [code, room] of this.rooms) {
      if (room.isEmpty() && now - room.lastActivity >= ttlMs) this.rooms.delete(code);
    }
  }
}
