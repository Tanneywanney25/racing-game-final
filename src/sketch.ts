import type p5 from 'p5';
import type { FruitType, GameConfig } from './config';
import { fruitYAt } from './game/model';
import type { LocalMatch } from './game/local';

export interface RenderState {
  match: LocalMatch | null;
  opponentX: number | null;
  opponentName: string;
  myName: string;
  phaseLabel: string;
}

export interface SketchDeps {
  cfg: GameConfig;
  state: RenderState;
  onFrame: (p: p5, dtMs: number) => void;
}

/** p5 render layer: jungle backdrop, deterministic fruit stream, both baskets. */
export function createSketch(deps: SketchDeps): (p: p5) => void {
  return (p: p5): void => {
    const { cfg, state } = deps;
    const images: Partial<Record<FruitType | 'jungle' | 'basket', p5.Image>> = {};

    p.preload = () => {
      images.jungle = p.loadImage('assets/jungle.jpg');
      images.basket = p.loadImage('assets/basket.png');
      images.apple = p.loadImage('assets/apple.png');
      images.banana = p.loadImage('assets/banana.png');
      images.melon = p.loadImage('assets/melon.png');
      images.orange = p.loadImage('assets/orange.png');
      images.pineapple = p.loadImage('assets/pineapple.png');
    };

    p.setup = () => {
      p.createCanvas(cfg.canvas.width, cfg.canvas.height).parent('stage');
      p.imageMode(p.CENTER);
      p.textFont('Segoe UI, system-ui, sans-serif');
    };

    function drawBasket(x: number, label: string, mine: boolean): void {
      const img = images.basket;
      if (img) p.image(img, x, cfg.basket.y, cfg.basket.width, cfg.basket.height);
      p.fill(mine ? '#ffe066' : '#ffffff');
      p.stroke(0);
      p.strokeWeight(3);
      p.textSize(15);
      p.textAlign(p.CENTER);
      p.text(label, x, cfg.basket.y + 52);
      p.noStroke();
    }

    p.draw = () => {
      const dtMs = Math.min(p.deltaTime, 100);
      deps.onFrame(p, dtMs);

      const jungle = images.jungle;
      if (jungle) {
        p.image(jungle, cfg.canvas.width / 2, cfg.canvas.height / 2, cfg.canvas.width, cfg.canvas.height);
      } else {
        p.background(30);
      }

      const match = state.match;
      if (match) {
        const elapsed = match.elapsedMs(Date.now());
        for (const fruit of match.fruits) {
          const img = images[fruit.type];
          const size = cfg.fruits.specs[fruit.type].size;
          const y = fruitYAt(fruit, elapsed);
          if (img && y > -size) p.image(img, fruit.x, y, size, size);
        }
        drawBasket(match.myX, `${state.myName} (you)`, true);
        if (state.opponentX !== null) {
          drawBasket(state.opponentX, state.opponentName, false);
        }
      } else {
        p.fill(255);
        p.stroke(0);
        p.strokeWeight(4);
        p.textAlign(p.CENTER);
        p.textSize(46);
        p.text('Fruit Catcher Online', cfg.canvas.width / 2, 210);
        p.textSize(18);
        p.text(state.phaseLabel, cfg.canvas.width / 2, 260);
        p.noStroke();
      }
    };
  };
}
