import type { GameConfig } from '../config';
import {
  catchesFruit,
  fruitFromIndex,
  fruitYAt,
  spawnCountAt,
  type FruitSpawn,
  type Seat,
} from './model';

export interface MatchInput {
  left: boolean;
  right: boolean;
}

/**
 * Client-side match simulation. The fruit stream is derived deterministically
 * from the shared seed, so both clients see identical fruit — only basket
 * positions and scores travel over the network.
 */
export class LocalMatch {
  myX: number;
  myScore = 0;
  /** Fruits currently visible on this client. */
  fruits: FruitSpawn[] = [];
  private nextIndex = 0;

  constructor(
    private readonly cfg: GameConfig,
    readonly seed: number,
    readonly startedAt: number,
    readonly mySeat: Seat,
  ) {
    this.myX = cfg.canvas.width / 2;
  }

  elapsedMs(nowMs: number): number {
    return Math.max(0, nowMs - this.startedAt);
  }

  remainingSeconds(nowMs: number): number {
    return Math.max(0, this.cfg.match.durationSeconds - this.elapsedMs(nowMs) / 1000);
  }

  get finished(): boolean {
    return false; // phase transitions come from the host via the network layer
  }

  update(nowMs: number, dtMs: number, input: MatchInput, opponentX: number | null): void {
    const elapsed = this.elapsedMs(nowMs);
    const dt = dtMs / 1000;

    // Deterministic spawning.
    const target = spawnCountAt(elapsed, this.cfg.fruits.intervalMs);
    while (this.nextIndex < target) {
      this.fruits.push(fruitFromIndex(this.nextIndex, this.seed, this.cfg));
      this.nextIndex += 1;
    }

    // Basket movement.
    const move = (Number(input.right) - Number(input.left)) * this.cfg.basket.speed * dt;
    const half = this.cfg.basket.width / 2;
    this.myX = Math.min(this.cfg.canvas.width - half, Math.max(half, this.myX + move));

    // Catches and cleanup.
    const { width, height } = this.cfg.basket;
    const myBasket = { x: this.myX, y: this.cfg.basket.y, w: width, h: height };
    const oppBasket =
      opponentX === null ? null : { x: opponentX, y: this.cfg.basket.y, w: width, h: height };

    this.fruits = this.fruits.filter((fruit) => {
      const y = fruitYAt(fruit, elapsed);
      const size = this.cfg.fruits.specs[fruit.type].size;
      if (y - size > this.cfg.canvas.height) return false; // fell through
      if (catchesFruit(myBasket, { x: fruit.x, y, size })) {
        this.myScore += this.cfg.fruits.specs[fruit.type].points;
        return false;
      }
      if (oppBasket && catchesFruit(oppBasket, { x: fruit.x, y, size })) {
        return false; // opponent's client awards their points
      }
      return true;
    });
  }
}
