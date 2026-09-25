import p5 from 'p5';
import { defaultConfig } from './config';
import { LocalMatch } from './game/local';
import { mergePlayers, type RoomPlayers, type Seat } from './game/model';
import { Net, readNetEnv } from './net/firebase';
import { createSketch, type RenderState } from './sketch';
import { Lobby } from './ui/lobby';
import { Scoreboard } from './ui/scoreboard';

const cfg = defaultConfig;
const scoreboard = new Scoreboard();

const renderState: RenderState = {
  match: null,
  opponentX: null,
  opponentName: '',
  myName: '',
  phaseLabel: 'Two-player online fruit catcher',
};

let net: Net | null = null;
let mySeat: Seat | null = null;
let players: RoomPlayers = {};
let phase: 'lobby' | 'playing' | 'finished' = 'lobby';
let lastWriteAt = 0;

const lobbyEl = document.querySelector<HTMLElement>('#lobby');
if (!lobbyEl) throw new Error('Missing #lobby element');

const lobby = new Lobby(lobbyEl, {
  onJoin: (name) => {
    if (!net) return;
    renderState.myName = name;
    void net.claimSeat(name).then((seat) => {
      if (seat === null) {
        lobby.showRoomFull();
      } else {
        mySeat = seat;
      }
    });
  },
  onStart: () => {
    net?.startMatch(Math.floor(Math.random() * 2 ** 31));
  },
  onPlayAgain: () => {
    net?.resetToLobby(players);
  },
});

function opponentSeatOf(seat: Seat): Seat {
  return seat === 1 ? 2 : 1;
}

function syncLobbyUi(): void {
  if (!net) return;
  if (phase === 'playing') {
    lobby.hide();
    return;
  }
  if (phase === 'finished' && mySeat !== null) {
    lobby.showResults(players, mySeat);
    return;
  }
  if (mySeat === null) {
    lobby.showJoin();
  } else {
    lobby.showSeats(players, mySeat, Boolean(players.player1 && players.player2));
  }
}

const env = readNetEnv(import.meta.env as Record<string, string | undefined>);
if (env) {
  net = new Net(env);
  net.watchConnection((online) => scoreboard.setConnection(online ? 'online' : 'offline'));
  net.watchRoom((room) => {
    players = mergePlayers(players, room.players ?? {});
    const nextPhase = room.phase ?? 'lobby';

    if (nextPhase === 'playing' && phase !== 'playing' && mySeat !== null && room.seed !== undefined) {
      renderState.match = new LocalMatch(cfg, room.seed, room.startedAt ?? Date.now(), mySeat);
    }
    if (nextPhase !== 'playing') {
      renderState.match = null;
    }
    phase = nextPhase;
    if (phase === 'lobby' && mySeat !== null) {
      // Our seat may have been cleared by a disconnect cleanup elsewhere.
      const mine = mySeat === 1 ? players.player1 : players.player2;
      if (!mine) mySeat = null;
    }
    syncLobbyUi();
  });
  syncLobbyUi();
} else {
  scoreboard.setConnection('none');
  lobby.showUnconfigured();
  renderState.phaseLabel = 'Firebase not configured — see the lobby panel';
}

new p5(
  createSketch({
    cfg,
    state: renderState,
    onFrame: (p, dtMs) => {
      const match = renderState.match;
      if (match && mySeat !== null && net) {
        const now = Date.now();
        const oppSeat = opponentSeatOf(mySeat);
        const opp = oppSeat === 1 ? players.player1 : players.player2;
        renderState.opponentX = opp?.x ?? null;
        renderState.opponentName = opp?.name ?? `Player ${oppSeat}`;

        match.update(
          now,
          dtMs,
          {
            left: p.keyIsDown(p.LEFT_ARROW) || p.keyIsDown(65),
            right: p.keyIsDown(p.RIGHT_ARROW) || p.keyIsDown(68),
          },
          renderState.opponentX,
        );

        // Throttled write of our own state.
        if (now - lastWriteAt >= cfg.net.writeIntervalMs) {
          lastWriteAt = now;
          net.writePlayer(mySeat, {
            name: renderState.myName,
            x: match.myX,
            score: match.myScore,
            updatedAt: now,
          });
        }

        // Keep our local scoreboard copy fresh even between remote echoes.
        const meKey = mySeat === 1 ? 'player1' : 'player2';
        const me = players[meKey];
        if (me) players[meKey] = { ...me, x: match.myX, score: match.myScore, updatedAt: now };

        const remaining = match.remainingSeconds(now);
        scoreboard.update(players, remaining);
        if (remaining <= 0 && mySeat === 1) {
          net.finishMatch();
        }
      } else {
        scoreboard.update(players, null);
      }
    },
  }),
);
