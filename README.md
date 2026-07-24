# Set — Speed Solitaire

A version of the classic card game **Set**. Play **single-player** — clear the whole
81-card deck as fast as you can — or **multiplayer**, racing friends to grab Sets on a
shared board in real time. Built with React + Vite + TypeScript, fully bilingual
(English / 简体中文).

**▶ Play it live: <https://set-game-qn3r.onrender.com/>**

[![CI](https://github.com/dcmshi/set-game/actions/workflows/ci.yml/badge.svg)](https://github.com/dcmshi/set-game/actions/workflows/ci.yml)

![Gameplay](docs/screenshots/gameplay.png)

## Screenshots

| Start screen | Hint — highlights a valid Set |
| :---: | :---: |
| ![Start screen](docs/screenshots/start.png) | ![Hint highlighting a valid Set](docs/screenshots/hint.png) |

## How to play

Find three cards where each of the four features — **number, shape, shading, color** —
is either all the same or all different across the three. Clear the entire deck to win,
and race the clock: wrong picks add 5 seconds, hints add 15. Your best time is saved
locally in your browser.

New here? The in-app **How to Play** screen walks through the rules with live example
cards, and the **EN / 中** toggle switches the whole UI between English and Simplified
Chinese.

## Multiplayer

Up to ~12 players share one live board and race to claim Sets. The first to select a
valid Set claims it and the cards are removed for everyone; a wrong pick locks that
player out for 5 seconds. Highest score when the deck is cleared wins.

- From the start screen, choose **Play with Friends**, then **create** a room or
  **join** one with its code. Share the room code or link (`/r/CODE`) to invite others.
- An authoritative **Node + WebSocket server** (in `server/`) owns the canonical game
  state and validates every claim, reusing the same pure Set logic as the client
  (`src/game/`).

Run both locally in separate terminals:

    npm run server     # WebSocket server on ws://localhost:8080
    npm run dev        # client — connects to that server by default

The client reads the server URL from `VITE_MP_SERVER_URL`, falling back to
`ws://localhost:8080` in development.

## Develop

    npm install
    npm run dev        # client dev server
    npm run server     # multiplayer WebSocket server (ws://localhost:8080)
    npm test           # full test suite (client + server)
    npm run typecheck  # TypeScript checks (client + server)
    npm run build      # production build to dist/

## Deploy (Render)

This repo's `render.yaml` defines two services:

- **`set-game`** — the Static Site (build `npm install && npm run build`, publish
  `dist`, SPA rewrite). Every push to `main` runs CI (typecheck + test + build) and
  triggers an automatic redeploy.
- **`set-mp-server`** — the multiplayer WebSocket server (Node, `npm run server`).

For multiplayer to work in production, set **`VITE_MP_SERVER_URL`** on the static site
to the server's `wss://…onrender.com` URL, then rebuild the site (Vite bakes the value
in at build time, so the env var alone isn't enough). The free server tier cold-starts
(~30–60s) after idle; single-player is unaffected if the server is down.
