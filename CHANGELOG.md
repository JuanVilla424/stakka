# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 🔄 [Unreleased]

### Added

- SRS rotation system with full wall kick and floor kick tables
- 7-bag randomizer for fair, balanced piece distribution
- Hold piece with single-use restriction per piece placement
- Next queue displaying 5 upcoming pieces
- Ghost piece rendering for drop preview
- Soft drop and hard drop with lock delay
- T-Spin detection: mini and full, single/double/triple variants
- Combo system with escalating score bonuses
- Back-to-back bonus for consecutive Tetris and T-Spin clears
- Level progression with increasing gravity speed
- DAS/ARR input system (Delayed Auto Shift / Auto Repeat Rate)
- SDF (Soft Drop Factor) configurable in settings
- Touch controls with swipe gesture recognition for mobile
- Responsive canvas layout across 375px, 768px, and 1920px breakpoints
- Dark and light themes with automatic OS preference detection
- Settings panel: DAS, ARR, SDF, volume, theme, ghost piece, grid toggle
- Particle effects, screen shake, and lock flash visual feedback
- High score leaderboard with localStorage persistence
- Procedural sound effects via Web Audio API (no external audio files)
- Master volume control in settings
- Aria landmark roles for accessibility
- GitHub Actions CI/CD workflow for automatic GitHub Pages deployment
- Pre-commit hooks for linting and formatting enforcement

### Changed

### Fixed

- Full row capture after piece lock to restore line clear animations

### Removed


## 🔖 [0.1.0] — Initial Release

- Initial project scaffolding with Vite + TypeScript + Canvas 2D
