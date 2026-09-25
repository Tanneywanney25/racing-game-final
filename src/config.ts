/** Central configuration for the two-player online fruit catcher. */

export type FruitType = 'apple' | 'banana' | 'melon' | 'orange' | 'pineapple';

export interface FruitSpec {
  points: number;
  size: number;
}

export interface GameConfig {
  canvas: { width: number; height: number };
  basket: {
    width: number;
    height: number;
    /** Horizontal speed, px/s. */
    speed: number;
    /** Fixed y of the basket center. */
    y: number;
  };
  fruits: {
    /** Deterministic spawn cadence, ms. */
    intervalMs: number;
    minFallSpeed: number;
    maxFallSpeed: number;
    specs: Record<FruitType, FruitSpec>;
  };
  match: {
    /** Match length in seconds. */
    durationSeconds: number;
  };
  net: {
    /** Throttle for writing our own player state, ms. */
    writeIntervalMs: number;
  };
}

export const defaultConfig: GameConfig = {
  canvas: { width: 1000, height: 600 },
  basket: { width: 96, height: 64, speed: 460, y: 540 },
  fruits: {
    intervalMs: 850,
    minFallSpeed: 190,
    maxFallSpeed: 330,
    specs: {
      apple: { points: 10, size: 56 },
      banana: { points: 10, size: 60 },
      melon: { points: 20, size: 68 },
      orange: { points: 10, size: 52 },
      pineapple: { points: 30, size: 64 },
    },
  },
  match: { durationSeconds: 60 },
  net: { writeIntervalMs: 150 },
};

export const FRUIT_TYPES: FruitType[] = ['apple', 'banana', 'melon', 'orange', 'pineapple'];
