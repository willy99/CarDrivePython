# 🕹️ My Playground

A React-based web playground hosting browser-playable games. Each game is
written in Python (Pygame) and compiled to WebAssembly with
[pygbag](https://pygame-web.github.io/), then embedded in the React app.

## Structure

```
CarDrivePython/
├── games/
│   └── cardrive/            ← Python source for CarDrive (Pygame)
│       ├── main.py          ← async entry point (pygbag-compatible)
│       ├── game.py, car.py, …
│       └── venv/            ← Python virtualenv (git-ignored)
├── public/
│   └── games/
│       └── cardrive/        ← pygbag build output (served statically)
├── src/
│   ├── components/
│   │   ├── GameCard.jsx     ← box-style button on the home page
│   │   └── GameFrame.jsx    ← full-screen iframe wrapper
│   ├── pages/
│   │   ├── HomePage.jsx     ← game registry + grid of cards
│   │   └── GamePage.jsx     ← /play/:id → shows the game
│   └── App.jsx              ← React Router routes
├── scripts/
│   └── build-cardrive.sh    ← rebuild + copy the game bundle
└── vite.config.js           ← injects COOP/COEP headers on /games/*
```

## Development

```bash
npm install
npm run dev          # → http://localhost:5173/
```

## Rebuilding the game

After editing Python source in `games/cardrive/`:

```bash
./scripts/build-cardrive.sh
```

This runs pygbag and copies the fresh bundle into `public/games/cardrive/`.

## Adding a new game

1. Put the Python source in `games/<name>/`.
2. Build it (adapt `scripts/build-cardrive.sh`).
3. Copy the bundle to `public/games/<name>/`.
4. Register it in **two** places:
   - `src/pages/HomePage.jsx` → add an entry to the `GAMES` array.
   - `src/pages/GamePage.jsx` → add `<name>: '/games/<name>/'` to `GAME_PATHS`.

## Why the COOP/COEP headers?

pygbag's WebAssembly runtime uses `SharedArrayBuffer`, which browsers only
allow in a *cross-origin-isolated* context. `vite.config.js` injects
`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers —
but **only** on `/games/*`, so the React app itself stays in a normal context.

For production hosting, replicate these headers on `/games/*`:
- **Netlify** → a `public/_headers` file
- **Vercel** → `vercel.json` headers rules
- **nginx** → `add_header` inside a `location /games/` block

## Production build

```bash
npm run build        # → dist/
npm run preview      # serve dist/ locally with isolation headers
```
