# stakka

A modern Tetris clone built with Vite + TypeScript + Canvas 2D.

**Live demo:** https://juanvilla424.github.io/stakka/

![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)
![Status](https://img.shields.io/badge/Status-Active-green.svg)

## Features

**Gameplay**
- SRS rotation system with wall kicks and floor kicks
- 7-bag randomizer for fair piece distribution
- Hold piece
- Next queue (5 pieces)
- Ghost piece for drop preview
- Soft drop and hard drop

**Scoring**
- Singles, doubles, triples, Tetris line clears
- T-Spin detection (mini and full, single/double/triple)
- Combos with escalating bonuses
- Back-to-back bonus for consecutive Tetris/T-Spin clears
- Level progression with increasing gravity

**Controls & Input**
- DAS/ARR configurable (Delayed Auto Shift / Auto Repeat Rate)
- SDF (Soft Drop Factor) configurable
- Touch controls for mobile with swipe gestures
- Responsive layout (375px → 1920px)

**UI & Themes**
- Dark and light themes with automatic OS preference detection
- Settings panel (DAS, ARR, SDF, volume, theme, ghost piece, grid)
- Visual effects: particles, screen shake, lock flash
- High score leaderboard with localStorage persistence

**Audio**
- Procedural sound effects via Web Audio API
- Master volume control
- No external audio files required

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

| Gesture | Action |
|---------|--------|
| Swipe left / right | Move piece |
| Swipe down | Soft drop |
| Swipe up | Hard drop |
| Tap | Rotate clockwise |
| Hold button (on-screen) | Hold piece |

## Tech Stack

- **Vite 6** — instant HMR, optimized production builds
- **TypeScript 5.7** — strict mode, ES2022 target
- **Canvas 2D** — 60fps rendering on a 10×20 grid
- **Web Audio API** — procedural sound effects with volume control

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run test suite (Vitest) |
| `npx eslint src/` | Lint source files |
| `npx tsc --noEmit` | Type-check without emitting |

## License

MIT
