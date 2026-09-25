# Fruit Catcher Online (racing-game-final)

Fruit Catcher Online is a two-player realtime browser game — the repo's historical "racing-game" name is wrong, and this rebuild says so. Two players claim seats in a Firebase Realtime Database lobby, then race to catch the most falling fruit in sixty seconds. The fruit stream is derived deterministically from a shared seed, so both clients see identical fruit with only basket positions and scores traveling over the wire; scores merge monotonically (max-wins) so stale writes can never lower a result. TypeScript throughout, with a typed network layer (seat claiming via transaction, disconnect cleanup, throttled state writes), a pure and unit-tested game model, and a thin p5.js render layer using the original jungle-and-basket art. Firebase credentials live in Vite env vars documented by `.env.example` — never in the repo. Vitest covers reconciliation, catch geometry, and stream determinism; GitHub Actions runs lint, tests, and build.

> **Naming note:** despite the repo name, this was never a racing game — the original
> course project's own title screen reads "FRUIT CATCHER". This is the **multiplayer**
> variant; the single-player arcade engine lives in
> [racing-game-core](https://github.com/Tanneywanney25/racing-game-core).

## How a match works

1. Both players open the app, enter a name, and **Join** — a Firebase transaction assigns
   seat 1 or 2 (the room caps at two; disconnects free the seat automatically).
2. The host (seat 1) presses **Start match**, which writes a shared seed + start time.
3. Each client derives the *same* fruit stream from that seed (`fruitFromIndex`) and
   simulates locally; only `{name, x, score, updatedAt}` is synced, throttled to 150 ms.
4. Catching fruit scores its points; after 60 s the host flips the phase to `finished`
   and the results panel shows the winner. **Play again** returns both players to the lobby.

Controls: `←`/`→` or `A`/`D`. The header shows both live scores, the countdown, and a
connection indicator fed by Firebase's `.info/connected`.

## Firebase setup

1. Create a Firebase project and a **Realtime Database** (test rules are fine to try it).
2. Register a Web app and copy the config values.
3. `cp .env.example .env` and fill in:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`.
4. Restart the dev server. Without a `.env`, the app boots into a clearly labeled
   "not configured" state instead of crashing.

On Vercel, set the same variables in Project → Settings → Environment Variables.

## Architecture

- `src/game/model.ts` — pure data model: score reconciliation (monotonic max), player
  merge by timestamp, catch geometry, deterministic fruit derivation. No Firebase, no p5.
- `src/game/local.ts` — client-side match simulation on top of the model.
- `src/net/firebase.ts` — the only Firebase-aware module: typed wrappers for seats,
  room state, match phase, and presence.
- `src/sketch.ts` — typed p5 rendering; `src/ui/` — DOM lobby and scoreboard.

## Tech stack

TypeScript (strict) · Vite · Firebase Realtime Database (v11 modular SDK) · p5.js ·
Vitest · ESLint + Prettier · GitHub Actions

## Local development

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

## Testing

`tests/reconcile.test.ts` (merge rules against a mocked remote room — stale writes,
idempotence, symmetry), `tests/catch.test.ts` (catch-box boundaries), and
`tests/stream.test.ts` (seeded determinism, bounds, stateless fruit positions).
CI runs lint, tests, and build on every push.

## Deploy

```bash
npm i -g vercel   # once
vercel deploy
```

Add the `VITE_FIREBASE_*` env vars in Vercel for the online mode to work.

## Project history

2022 course project (p5 globals, Firebase v7 CDN scripts, config committed inline).
Rebuilt in 2026: typed modules, env-var credentials, transactional seat claiming,
deterministic shared fruit stream, tests, CI, and deploy config.
