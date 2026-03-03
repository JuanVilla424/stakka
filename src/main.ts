import './style.css'
import { Game, GameState } from './game'
import { UIManager } from './ui'
import { isTouchDevice } from './touch'
import { audio, SoundEffect } from './audio'
import { LayoutManager } from './layout'
import { storageManager, LeaderboardEntry } from './storage'

const app = document.getElementById('app') as HTMLDivElement

const canvas = document.createElement('canvas')
canvas.id = 'game-canvas'
app.appendChild(canvas)

const ui = new UIManager(app)
const game = new Game(canvas)
const layoutManager = new LayoutManager()

// Wire UI touch buttons into the game loop
game.setActionProvider(() => ui.pollTouchActions())

function handleBack(): void {
  ui.showStart()
  const entries = storageManager.getLeaderboard()
  ui.updateHighScore(entries.length > 0 ? entries[0].score : 0)
}

function handleClear(): void {
  storageManager.clearLeaderboard()
  ui.showLeaderboard([], undefined, handleBack, handleClear)
}

function openLeaderboard(highlightIndex?: number): void {
  const entries = storageManager.getLeaderboard()
  ui.showLeaderboard(entries, highlightIndex, handleBack, handleClear)
}

ui.setOnLeaderboardOpen(() => openLeaderboard())

game.setOnStateChange((state) => {
  if (state === GameState.PAUSED) {
    ui.showPause()
  } else if (state === GameState.GAME_OVER) {
    const score = game.getScore()
    const level = game.getLevel()
    const lines = game.getLines()
    const time = game.getElapsedTime()
    const date = new Date().toISOString().split('T')[0]

    if (storageManager.isHighScore(score)) {
      ui.showGameOver(
        { score, level, lines },
        {
          defaultName: storageManager.getLastName(),
          onNameSubmit: (name: string) => {
            storageManager.saveName(name)
            const entry: LeaderboardEntry = {
              name,
              score,
              level,
              lines,
              time,
              date,
            }
            const rank = storageManager.addEntry(entry)
            openLeaderboard(rank > 0 ? rank - 1 : undefined)
          },
          onViewLeaderboard: () => openLeaderboard(),
        }
      )
    } else {
      ui.showGameOver(
        { score, level, lines },
        { onViewLeaderboard: () => openLeaderboard() }
      )
    }
  }
})

document.addEventListener('keydown', (e: KeyboardEvent) => {
  // Don't intercept keystrokes in text input fields
  if ((e.target as HTMLElement).tagName === 'INPUT') return

  if (e.key === 'm' || e.key === 'M') {
    audio.toggleMute()
    return
  }
  const state = game.getState()
  if (state === GameState.IDLE || state === GameState.GAME_OVER) {
    if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
      audio.play(SoundEffect.MenuSelect)
      ui.hide()
      game.start()
    }
  } else if (state === GameState.PAUSED) {
    if (e.key === 'Escape') {
      audio.play(SoundEffect.MenuSelect)
      ui.hide()
      game.resume()
    }
  }
})

// Tap overlay screens to start/resume on touch devices
app.addEventListener(
  'touchstart',
  (e: TouchEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.overlay-screen')) return
    // Don't intercept taps on interactive elements
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.closest('button') ||
      target.closest('input')
    )
      return
    e.preventDefault()
    const state = game.getState()
    if (state === GameState.IDLE || state === GameState.GAME_OVER) {
      ui.hide()
      game.start()
    } else if (state === GameState.PAUSED) {
      ui.hide()
      game.resume()
    }
  },
  { passive: false }
)

function applyLayout(): void {
  game.resize(layoutManager.cellSize)
  document.body.dataset.breakpoint = layoutManager.breakpoint
  if (isTouchDevice()) {
    if (layoutManager.breakpoint === 'desktop') {
      ui.hideTouchControls()
    } else {
      ui.showTouchControls()
    }
  }
}

layoutManager.calculateLayout(window.innerWidth, window.innerHeight)
layoutManager.attach(() => applyLayout())
applyLayout()

// Initialize high score display
const initialEntries = storageManager.getLeaderboard()
ui.updateHighScore(initialEntries.length > 0 ? initialEntries[0].score : 0)

ui.showStart()
