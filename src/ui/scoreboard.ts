import type { RoomPlayers } from '../game/model';

/** Header scoreboard: both players' live scores, the timer, connection dot. */
export class Scoreboard {
  private readonly p1El: HTMLElement;
  private readonly p2El: HTMLElement;
  private readonly timerEl: HTMLElement;
  private readonly connEl: HTMLElement;

  constructor() {
    this.p1El = Scoreboard.require('#hud-p1');
    this.p2El = Scoreboard.require('#hud-p2');
    this.timerEl = Scoreboard.require('#hud-timer');
    this.connEl = Scoreboard.require('#hud-conn');
  }

  private static require(selector: string): HTMLElement {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`Missing element ${selector}`);
    return el;
  }

  update(players: RoomPlayers, remainingSeconds: number | null): void {
    this.p1El.textContent = players.player1
      ? `${players.player1.name}: ${players.player1.score}`
      : 'Seat 1: —';
    this.p2El.textContent = players.player2
      ? `${players.player2.name}: ${players.player2.score}`
      : 'Seat 2: —';
    this.timerEl.textContent =
      remainingSeconds === null ? '' : `⏱ ${Math.ceil(remainingSeconds)}s`;
  }

  setConnection(state: 'online' | 'offline' | 'none'): void {
    const map = { online: '● online', offline: '● offline', none: '○ local' } as const;
    this.connEl.textContent = map[state];
    this.connEl.dataset['state'] = state;
  }
}
