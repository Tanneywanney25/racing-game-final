/** Pure, unit-tested game/data model — no p5, no Firebase imports. */

import type { FruitType, GameConfig } from '../config';
import { FRUIT_TYPES } from '../config';

export type Seat = 1 | 2;

export type GamePhase = 'lobby' | 'playing' | 'finished';

export interface PlayerData {
  name: string;
  /** Basket center x. */
  x: number;
  score: number;
  /** Client ms timestamp of the last write — newer wins for position/name. */
  updatedAt: number;
}

export interface RoomPlayers {
  player1?: PlayerData;
  player2?: PlayerData;
}

export interface RoomState {
  phase: GamePhase;
  /** Shared seed so both clients see the identical fruit stream. */
  seed: number;
  /** Match start, client ms of the starting player. */
  startedAt: number;
  players: RoomPlayers;
}

// --- Reconciliation ---------------------------------------------------------

/** Scores are monotonic within a match: the higher value is always the truth. */
export function reconcileScore(local: number, remote: number): number {
  return Math.max(local, remote);
}

/**
 * Merge our view of a player with the remote copy:
 * score takes the monotonic max, position/name follow the newer timestamp.
 */
export function mergePlayer(
  local: PlayerData | undefined,
  remote: PlayerData | undefined,
): PlayerData | undefined {
  if (!local) return remote;
  if (!remote) return local;
  const newer = remote.updatedAt >= local.updatedAt ? remote : local;
  return {
    name: newer.name,
    x: newer.x,
    updatedAt: newer.updatedAt,
    score: reconcileScore(local.score, remote.score),
  };
}

/** Merge both seats. Symmetric: merge(a, b) and merge(b, a) agree on scores. */
export function mergePlayers(local: RoomPlayers, remote: RoomPlayers): RoomPlayers {
  const merged: RoomPlayers = {};
  const p1 = mergePlayer(local.player1, remote.player1);
  const p2 = mergePlayer(local.player2, remote.player2);
  if (p1) merged.player1 = p1;
  if (p2) merged.player2 = p2;
  return merged;
}

// --- Catch detection --------------------------------------------------------

export interface BasketRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FruitPoint {
  x: number;
  y: number;
  size: number;
}

/** A fruit is caught when its center enters the basket's catch box. */
export function catchesFruit(basket: BasketRect, fruit: FruitPoint): boolean {
  return (
    Math.abs(fruit.x - basket.x) < (basket.w + fruit.size) / 2 &&
    Math.abs(fruit.y - basket.y) < (basket.h + fruit.size) / 2
  );
}

// --- Deterministic fruit stream ----------------------------------------------

/** How many fruits should exist by `elapsedMs` under a fixed cadence. */
export function spawnCountAt(elapsedMs: number, intervalMs: number): number {
  if (elapsedMs < 0) return 0;
  return Math.floor(elapsedMs / intervalMs);
}

function hashRng(seed: number, index: number): () => number {
  // mulberry32 seeded by (seed, index) so any fruit is derivable independently.
  let state = (seed ^ (index * 0x9e3779b9)) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface FruitSpawn {
  index: number;
  type: FruitType;
  /** Spawn x (center). */
  x: number;
  /** Fall speed px/s. */
  speed: number;
  /** Spawn time relative to match start, ms. */
  atMs: number;
}

/** Derive fruit #index deterministically from the shared seed. */
export function fruitFromIndex(index: number, seed: number, cfg: GameConfig): FruitSpawn {
  const rng = hashRng(seed, index);
  const type = FRUIT_TYPES[Math.floor(rng() * FRUIT_TYPES.length)] ?? 'apple';
  const margin = 60;
  return {
    index,
    type,
    x: margin + rng() * (cfg.canvas.width - margin * 2),
    speed:
      cfg.fruits.minFallSpeed + rng() * (cfg.fruits.maxFallSpeed - cfg.fruits.minFallSpeed),
    atMs: index * cfg.fruits.intervalMs,
  };
}

/** Fruit y position at `elapsedMs` since match start (deterministic, no integration). */
export function fruitYAt(spawn: FruitSpawn, elapsedMs: number): number {
  return ((elapsedMs - spawn.atMs) / 1000) * spawn.speed;
}
