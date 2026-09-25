/** Typed Firebase Realtime Database layer. The only module that talks to Firebase. */

import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  runTransaction,
  set,
  update,
  type Database,
} from 'firebase/database';
import type { GamePhase, PlayerData, RoomPlayers, Seat } from '../game/model';

export interface NetEnv {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  appId: string;
}

/** Read Firebase config from Vite env vars; null when not configured. */
export function readNetEnv(env: Record<string, string | undefined>): NetEnv | null {
  const apiKey = env['VITE_FIREBASE_API_KEY'];
  const databaseURL = env['VITE_FIREBASE_DATABASE_URL'];
  if (!apiKey || !databaseURL) return null;
  return {
    apiKey,
    databaseURL,
    authDomain: env['VITE_FIREBASE_AUTH_DOMAIN'] ?? '',
    projectId: env['VITE_FIREBASE_PROJECT_ID'] ?? '',
    appId: env['VITE_FIREBASE_APP_ID'] ?? '',
  };
}

const ROOM = 'rooms/default';

export interface RoomSnapshot {
  phase?: GamePhase;
  seed?: number;
  startedAt?: number;
  players?: RoomPlayers;
}

export class Net {
  private readonly db: Database;

  constructor(env: NetEnv) {
    const app = initializeApp(env);
    this.db = getDatabase(app);
  }

  /** Firebase's connection heartbeat. */
  watchConnection(cb: (online: boolean) => void): void {
    onValue(ref(this.db, '.info/connected'), (snap) => cb(snap.val() === true));
  }

  watchRoom(cb: (room: RoomSnapshot) => void): void {
    onValue(ref(this.db, ROOM), (snap) => cb((snap.val() as RoomSnapshot | null) ?? {}));
  }

  /**
   * Atomically claim the first free seat; resolves null when the room is full.
   * The seat's player node is removed automatically on disconnect.
   */
  async claimSeat(name: string): Promise<Seat | null> {
    let claimed: Seat | null = null;
    await runTransaction(ref(this.db, `${ROOM}/players`), (current: RoomPlayers | null) => {
      const players = current ?? {};
      const seat: Seat | null = !players.player1 ? 1 : !players.player2 ? 2 : null;
      claimed = seat;
      if (seat === null) return players; // room full — commit unchanged
      const me: PlayerData = { name, x: 500, score: 0, updatedAt: Date.now() };
      return { ...players, [`player${seat}`]: me };
    });
    if (claimed !== null) {
      void onDisconnect(ref(this.db, `${ROOM}/players/player${claimed}`)).remove();
    }
    return claimed;
  }

  /** Throttled by the caller; writes our own seat's state. */
  writePlayer(seat: Seat, data: PlayerData): void {
    void set(ref(this.db, `${ROOM}/players/player${seat}`), data);
  }

  /** Host (seat 1) starts a match with a shared seed. */
  startMatch(seed: number): void {
    void update(ref(this.db, ROOM), {
      phase: 'playing' satisfies GamePhase,
      seed,
      startedAt: Date.now(),
    });
  }

  finishMatch(): void {
    void update(ref(this.db, ROOM), { phase: 'finished' satisfies GamePhase });
  }

  /** Back to lobby: reset scores, keep seats. */
  resetToLobby(players: RoomPlayers): void {
    const cleared: RoomPlayers = {};
    if (players.player1) cleared.player1 = { ...players.player1, score: 0 };
    if (players.player2) cleared.player2 = { ...players.player2, score: 0 };
    void update(ref(this.db, ROOM), {
      phase: 'lobby' satisfies GamePhase,
      players: cleared,
    });
  }

  leaveSeat(seat: Seat): void {
    void set(ref(this.db, `${ROOM}/players/player${seat}`), null);
  }
}
