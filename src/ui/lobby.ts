import type { RoomPlayers, Seat } from '../game/model';

export interface LobbyHooks {
  onJoin: (name: string) => void;
  onStart: () => void;
  onPlayAgain: () => void;
}

/** DOM lobby overlay: join form, seat list, host start button, results view. */
export class Lobby {
  private readonly root: HTMLElement;

  constructor(root: HTMLElement, private readonly hooks: LobbyHooks) {
    this.root = root;
  }

  showUnconfigured(): void {
    this.root.hidden = false;
    this.root.innerHTML = `
      <h2>Firebase not configured</h2>
      <p>This is the two-player online build. To play online, copy <code>.env.example</code>
      to <code>.env</code>, fill in your Firebase Realtime Database credentials, and restart
      the dev server. See the README for setup steps.</p>`;
  }

  showJoin(): void {
    this.root.hidden = false;
    this.root.innerHTML = `
      <h2>Join the match</h2>
      <form id="join-form">
        <input id="join-name" type="text" placeholder="Your name" maxlength="16" required />
        <button type="submit">Join</button>
      </form>
      <p class="hint">First two players get the seats. Arrow keys / A·D to move.</p>`;
    const form = this.root.querySelector<HTMLFormElement>('#join-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = this.root.querySelector<HTMLInputElement>('#join-name');
      const name = input?.value.trim();
      if (name) this.hooks.onJoin(name);
    });
  }

  showSeats(players: RoomPlayers, mySeat: Seat, bothReady: boolean): void {
    this.root.hidden = false;
    const seatRow = (seat: Seat): string => {
      const p = seat === 1 ? players.player1 : players.player2;
      const you = seat === mySeat ? ' <em>(you)</em>' : '';
      return `<li>Seat ${seat}: ${p ? `<strong>${escapeHtml(p.name)}</strong>${you}` : '<span class="empty">waiting…</span>'}</li>`;
    };
    const hostControls =
      mySeat === 1
        ? bothReady
          ? '<button id="start-btn" type="button">Start match</button>'
          : '<p class="hint">Start unlocks when seat 2 is filled.</p>'
        : '<p class="hint">Waiting for the host (seat 1) to start…</p>';
    this.root.innerHTML = `
      <h2>Lobby</h2>
      <ul class="seats">${seatRow(1)}${seatRow(2)}</ul>
      ${hostControls}`;
    this.root.querySelector('#start-btn')?.addEventListener('click', () => this.hooks.onStart());
  }

  showResults(players: RoomPlayers, mySeat: Seat): void {
    this.root.hidden = false;
    const p1 = players.player1;
    const p2 = players.player2;
    const s1 = p1?.score ?? 0;
    const s2 = p2?.score ?? 0;
    const verdict =
      s1 === s2
        ? "It's a tie!"
        : `${escapeHtml((s1 > s2 ? p1?.name : p2?.name) ?? '?')} wins!`;
    const again =
      mySeat === 1
        ? '<button id="again-btn" type="button">Play again</button>'
        : '<p class="hint">Waiting for the host to restart…</p>';
    this.root.innerHTML = `
      <h2>Match over — ${verdict}</h2>
      <ul class="seats">
        <li>${escapeHtml(p1?.name ?? 'Player 1')}: <strong>${s1}</strong></li>
        <li>${escapeHtml(p2?.name ?? 'Player 2')}: <strong>${s2}</strong></li>
      </ul>
      ${again}`;
    this.root.querySelector('#again-btn')?.addEventListener('click', () => this.hooks.onPlayAgain());
  }

  showRoomFull(): void {
    this.root.hidden = false;
    this.root.innerHTML = '<h2>Room is full</h2><p>Two players are already seated.</p>';
  }

  hide(): void {
    this.root.hidden = true;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
