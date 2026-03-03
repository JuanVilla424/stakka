# 🎮 stakka

A modern Tetris clone built with Vite + TypeScript + Canvas 2D. Fully client-side, no backend required — runs in any modern browser with 60fps rendering and procedural audio.

**Live demo:** https://juanvilla424.github.io/stakka/

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Build](https://img.shields.io/github/actions/workflow/status/JuanVilla424/stakka/deploy.yml)](https://github.com/JuanVilla424/stakka/actions)
[![Status](https://img.shields.io/badge/Status-Active-green.svg)](https://juanvilla424.github.io/stakka/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📚 Table of Contents

- [🌟 Features](#-features)
- [🚀 Getting Started](#-getting-started)
  - [📋 Prerequisites](#-prerequisites)
  - [🔨 Installation](#-installation)
  - [🔧 Environment Setup](#-environment-setup)
  - [🛸 Pre-Commit Hooks](#-pre-commit-hooks)
- [🎮 Controls](#-controls)
- [🛠 Tech Stack](#-tech-stack)
- [📋 Scripts](#-scripts)
- [🤝 Contributing](#-contributing)
- [📫 Contact](#-contact)
- [📜 License](#-license)

---

## 🌟 Features

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

---

## 🚀 Getting Started

### 📋 Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [npm](https://www.npmjs.com/) 10+
- [Python](https://www.python.org/) 3.11+ (for pre-commit hooks)

### 🔨 Installation

```bash
git clone https://github.com/JuanVilla424/stakka.git
cd stakka
```

### 🔧 Environment Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### 🛸 Pre-Commit Hooks

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.dev.txt
pre-commit install
pre-commit install --hook-type pre-push
```

---

## 🎮 Controls

### ⌨️ Keyboard

| Key | Action |
|-----|--------|
| `←` / `→` | Move left / right |
| `↑` / `X` / `W` | Rotate clockwise |
| `Z` | Rotate counter-clockwise |
| `↓` / `S` | Soft drop |
| `Space` | Hard drop |
| `C` / `Shift` | Hold piece |
| `Esc` | Pause / resume |
| `Enter` / `R` | Start / restart |

### 👆 Touch

| Gesture | Action |
|---------|--------|
| Swipe left / right | Move piece |
| Swipe down | Soft drop |
| Swipe up | Hard drop |
| Tap | Rotate clockwise |
| Hold button (on-screen) | Hold piece |

---

## 🛠 Tech Stack

- **Vite 6** — instant HMR, optimized production builds
- **TypeScript 5.7** — strict mode, ES2022 target
- **Canvas 2D** — 60fps rendering on a 10×20 grid
- **Web Audio API** — procedural sound effects with volume control

---

## 📋 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run test suite (Vitest) |
| `npx eslint src/` | Lint source files |
| `npx tsc --noEmit` | Type-check without emitting |

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting a pull request.

---

## 📫 Contact

For questions or security issues, see [SECURITY.md](SECURITY.md) or open an [issue](https://github.com/JuanVilla424/stakka/issues).

---

## 📜 License

2026 - This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this software under the terms of the MIT license. For more details, please refer to the [LICENSE](LICENSE) file included in this repository.
