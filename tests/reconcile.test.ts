import { describe, expect, it } from 'vitest';
import { mergePlayer, mergePlayers, reconcileScore, type PlayerData } from '../src/game/model';

const at = (over: Partial<PlayerData> = {}): PlayerData => ({
  name: 'A',
  x: 500,
  score: 0,
  updatedAt: 1000,
  ...over,
});

describe('reconcileScore', () => {
  it('takes the higher score in either direction', () => {
    expect(reconcileScore(10, 30)).toBe(30);
    expect(reconcileScore(30, 10)).toBe(30);
    expect(reconcileScore(5, 5)).toBe(5);
  });
});

describe('mergePlayer', () => {
  it('keeps the local copy when remote is missing, and vice versa', () => {
    const local = at({ score: 12 });
    expect(mergePlayer(local, undefined)).toEqual(local);
    expect(mergePlayer(undefined, local)).toEqual(local);
    expect(mergePlayer(undefined, undefined)).toBeUndefined();
  });

  it('takes position and name from the newer write', () => {
    const local = at({ x: 100, name: 'Old', updatedAt: 1000 });
    const remote = at({ x: 700, name: 'New', updatedAt: 2000 });
    const merged = mergePlayer(local, remote)!;
    expect(merged.x).toBe(700);
    expect(merged.name).toBe('New');
  });

  it('never lets a stale write lower the score', () => {
    const local = at({ score: 50, updatedAt: 3000 });
    const staleRemote = at({ score: 20, updatedAt: 1000 });
    expect(mergePlayer(local, staleRemote)!.score).toBe(50);

    const newerButLower = at({ score: 20, updatedAt: 9000 });
    expect(mergePlayer(local, newerButLower)!.score).toBe(50);
  });

  it('is score-symmetric: merge(a,b) and merge(b,a) agree on the score', () => {
    const a = at({ score: 40, updatedAt: 1500 });
    const b = at({ score: 55, updatedAt: 1200 });
    expect(mergePlayer(a, b)!.score).toBe(mergePlayer(b, a)!.score);
  });
});

describe('mergePlayers (mocked remote room)', () => {
  it('merges both seats and preserves solo seats', () => {
    const local = { player1: at({ name: 'Tanush', score: 30 }) };
    const remote = {
      player1: at({ name: 'Tanush', score: 45, updatedAt: 2000 }),
      player2: at({ name: 'Rival', score: 10 }),
    };
    const merged = mergePlayers(local, remote);
    expect(merged.player1?.score).toBe(45);
    expect(merged.player2?.name).toBe('Rival');
  });

  it('is idempotent: merging the same remote twice changes nothing', () => {
    const local = { player1: at({ score: 5 }) };
    const remote = { player1: at({ score: 9, updatedAt: 2000 }) };
    const once = mergePlayers(local, remote);
    const twice = mergePlayers(once, remote);
    expect(twice).toEqual(once);
  });

  it('an empty remote room keeps local state intact', () => {
    const local = { player2: at({ name: 'OnlyMe' }) };
    expect(mergePlayers(local, {})).toEqual(local);
  });
});
