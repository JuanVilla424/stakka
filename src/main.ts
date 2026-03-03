import './style.css'
import { Game, GameState } from './game'
import { UIManager } from './ui'
import { isTouchDevice } from './touch'
import { audio, SoundEffect } from './audio'

const app = document.getElementById('app') as HTMLDivElement

const canvas = document.createElement('canvas')
canvas.id = 'game-canvas'
app.appendChild(canvas)

const ui = new UIManager(app)
const game = new Game(canvas)

// Wire UI touch buttons into the game loop
game.setActionProvider(() => ui.pollTouchActions())

game.setOnStateChange((state) => {
  if (state === GameState.PAUSED) {
    ui.showPause()
  } else if (state === GameState.GAME_OVER) {
    ui.showGameOver({
      score: game.getScore(),
      level: game.getLevel(),
      lines: game.getLines(),
    })
  }
})

document.addEventListener('keydown', (e: KeyboardEvent) => {
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

if (isTouchDevice()) {
  ui.showTouchControls()
}

ui.showStart()
