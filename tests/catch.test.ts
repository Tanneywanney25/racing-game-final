import { describe, expect, it } from 'vitest';
import { catchesFruit } from '../src/game/model';

const basket = { x: 500, y: 540, w: 96, h: 64 };

describe('catchesFruit', () => {
  it('catches a fruit centered on the basket', () => {
    expect(catchesFruit(basket, { x: 500, y: 540, size: 56 })).toBe(true);
  });

  it('catches at the horizontal fringe, misses just beyond it', () => {
    const size = 56;
    const reach = (basket.w + size) / 2; // 76
    expect(catchesFruit(basket, { x: 500 + reach - 1, y: 540, size })).toBe(true);
    expect(catchesFruit(basket, { x: 500 + reach, y: 540, size })).toBe(false);
  });

  it('misses fruit still far above the basket', () => {
    expect(catchesFruit(basket, { x: 500, y: 100, size: 56 })).toBe(false);
  });

  it('vertical window matches (h + size) / 2', () => {
    const size = 56;
    const reach = (basket.h + size) / 2; // 60
    expect(catchesFruit(basket, { x: 500, y: 540 - reach + 1, size })).toBe(true);
    expect(catchesFruit(basket, { x: 500, y: 540 - reach, size })).toBe(false);
  });

  it('bigger fruit is easier to catch', () => {
    const atEdge = { x: 560, y: 540 };
    expect(catchesFruit(basket, { ...atEdge, size: 20 })).toBe(false);
    expect(catchesFruit(basket, { ...atEdge, size: 40 })).toBe(true);
  });
});
