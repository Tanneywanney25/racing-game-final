import { describe, expect, it } from 'vitest';
import { defaultConfig, FRUIT_TYPES } from '../src/config';
import { fruitFromIndex, fruitYAt, spawnCountAt } from '../src/game/model';

describe('spawnCountAt', () => {
  it('is zero before the first interval and negative time', () => {
    expect(spawnCountAt(0, 850)).toBe(0);
    expect(spawnCountAt(849, 850)).toBe(0);
    expect(spawnCountAt(-100, 850)).toBe(0);
  });

  it('steps once per interval', () => {
    expect(spawnCountAt(850, 850)).toBe(1);
    expect(spawnCountAt(8500, 850)).toBe(10);
  });
});

describe('deterministic fruit stream', () => {
  it('same seed and index produce identical fruit on any client', () => {
    const a = fruitFromIndex(7, 123456, defaultConfig);
    const b = fruitFromIndex(7, 123456, defaultConfig);
    expect(a).toEqual(b);
  });

  it('different seeds produce a different stream', () => {
    const s1 = Array.from({ length: 12 }, (_, i) => fruitFromIndex(i, 1, defaultConfig));
    const s2 = Array.from({ length: 12 }, (_, i) => fruitFromIndex(i, 2, defaultConfig));
    expect(s1).not.toEqual(s2);
  });

  it('fruit properties stay inside configured bounds', () => {
    for (let i = 0; i < 200; i++) {
      const f = fruitFromIndex(i, 42, defaultConfig);
      expect(FRUIT_TYPES).toContain(f.type);
      expect(f.x).toBeGreaterThanOrEqual(60);
      expect(f.x).toBeLessThanOrEqual(defaultConfig.canvas.width - 60);
      expect(f.speed).toBeGreaterThanOrEqual(defaultConfig.fruits.minFallSpeed);
      expect(f.speed).toBeLessThanOrEqual(defaultConfig.fruits.maxFallSpeed);
      expect(f.atMs).toBe(i * defaultConfig.fruits.intervalMs);
    }
  });

  it('fruitYAt is a pure function of elapsed time (no drift)', () => {
    const f = fruitFromIndex(3, 42, defaultConfig);
    const yEarly = fruitYAt(f, f.atMs + 1000);
    expect(yEarly).toBeCloseTo(f.speed);
    // Evaluating out of order gives the same answers — position is stateless.
    const y2 = fruitYAt(f, f.atMs + 2000);
    const y1again = fruitYAt(f, f.atMs + 1000);
    expect(y1again).toBeCloseTo(yEarly);
    expect(y2).toBeCloseTo(f.speed * 2);
  });
});
