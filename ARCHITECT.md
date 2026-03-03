# stakka — Module Architecture

## 📖 Overview

Stakka is a Tetris clone built with Vite + TypeScript + Canvas 2D. No frameworks.
All game state lives in typed classes. Rendering uses a single Canvas element.

## 🗂 Module Map

| Module | File | Responsibility |
|--------|------|---------------|
| **Types** | `src/types.ts` | Shared TypeScript interfaces and enums used across all modules |
| **Board** | `src/board.ts` | 10×20 grid state, collision detection, line clear logic |
| **Piece** | `src/piece.ts` | Tetromino shapes, positions, rotation states |
| **SRS** | `src/srs.ts` | Super Rotation System — wall kick tables and rotation logic |
| **Randomizer** | `src/randomizer.ts` | 7-bag randomizer for fair piece distribution |
| **Scoring** | `src/scoring.ts` | Line clear scoring, T-Spin detection, combos, B2B, level progression |
| **Renderer** | `src/renderer.ts` | Canvas 2D drawing: board, pieces, ghost, hold, next queue, effects |
| **Input** | `src/input.ts` | Keyboard event handling, DAS/ARR repeat logic |
| **Touch** | `src/touch.ts` | Touch/pointer events, swipe gesture recognition |
| **Audio** | `src/audio.ts` | Web Audio API procedural sound effects, volume control |
| **UI** | `src/ui.ts` | DOM overlay panels: start screen, pause, game over, leaderboard, settings |
| **Theme** | `src/theme.ts` | Dark/light theme switching, OS preference detection, CSS variable management |
| **Layout** | `src/layout.ts` | Responsive canvas sizing at 375px / 768px / 1920px breakpoints |
| **Settings** | `src/settings.ts` | User preferences: DAS, ARR, SDF, volume, theme, ghost, grid |
| **Storage** | `src/storage.ts` | localStorage persistence for settings and high score leaderboard |
| **Effects** | `src/effects.ts` | Particle system, screen shake, lock flash visual effects |
| **Animations** | `src/animations.ts` | Line clear animations, piece placement animations |
| **Game** | `src/game.ts` | Central game loop, state machine (idle → playing → paused → game over) |
| **Main** | `src/main.ts` | Entry point — wires all modules together, bootstraps the game |

## 🔄 Data Flow

```
main.ts
  └─ Game (game loop, state machine)
       ├─ Board → Piece → SRS → Randomizer
       ├─ Scoring (line clears → score/level)
       ├─ Renderer (Canvas draw calls)
       ├─ Input + Touch → Game actions
       ├─ Audio (sound on events)
       ├─ Effects + Animations (visual feedback)
       ├─ UI (overlay panels)
       ├─ Theme + Layout (responsive, themed canvas)
       └─ Settings + Storage (persistence)
```

## ⚙️ State Machine

```
idle → playing → paused → playing → game_over → idle
```

## 🔨 Build

- `npm run build` → `dist/` (TypeScript → ES2022 → Vite tree-shake + minify)
- Base path: `/stakka/` for GitHub Pages subdirectory hosting
- Bundle: ~17KB gzip JS + ~3KB gzip CSS

## 🚀 Deployment

GitHub Pages via `.github/workflows/deploy.yml` — auto-deploys on push to `main`.
Live URL: https://juanvilla424.github.io/stakka/
