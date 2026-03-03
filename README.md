# stakka

A modern Tetris clone built with Vite + TypeScript + Canvas 2D.

**Live demo:** https://juanvilla424.github.io/stakka/

![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)
![Status](https://img.shields.io/badge/Status-Active-green.svg)

## Features

- SRS rotation system with wall kicks
- 7-bag randomizer
- Hold piece
- Next queue (5 pieces)
- Ghost piece
- DAS/ARR configurable
- Scoring: singles, doubles, triples, Tetris, T-Spins, combos, back-to-back
- Dark and light themes
- Settings panel (DAS, ARR, volume, theme, SDF)
- High score leaderboard with localStorage persistence
- Touch controls for mobile
- Responsive layout (375px → 1920px)
- 60fps Canvas rendering
- Web Audio API sound effects

## Controls

### Keyboard

| Key | Action |
|-----|--------|
| `←` / `→` | Move left / right |
| `↑` / `X` | Rotate clockwise |
| `Z` / `Ctrl` | Rotate counter-clockwise |
| `↓` | Soft drop |
| `Space` | Hard drop |
| `C` / `Shift` | Hold piece |
| `Esc` | Pause / resume |
| `Enter` | Start / confirm |

### Touch

Swipe left/right to move, swipe down to soft drop, tap to rotate, swipe up to hard drop. Use the on-screen hold button to hold.

## Tech Stack

- **Vite 6** — instant HMR, optimized production builds
- **TypeScript 5.7** — strict mode, ES2022 target
- **Canvas 2D** — 60fps rendering on a 10×20 grid
- **Web Audio API** — sound effects with volume control

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + Vite build |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests (Vitest) |
| `npx eslint src/` | Lint source files |

## License

MIT
